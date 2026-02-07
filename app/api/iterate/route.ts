import { NextRequest } from "next/server";
import {
  getAnthropicClient,
  MODEL,
  buildIterationMessages,
} from "@/lib/claude";
import { ITERATION_SYSTEM_PROMPT } from "@/lib/prompts";
import type { IterateRequest } from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log("[iterate] POST request received");

  try {
    const body: IterateRequest = await request.json();
    const { currentHtml, instruction } = body;

    console.log("[iterate] Payload:", {
      htmlLength: currentHtml?.length ?? 0,
      instruction: instruction?.slice(0, 100),
    });

    if (!currentHtml || !instruction) {
      console.warn("[iterate] Missing required fields");
      return new Response(
        JSON.stringify({
          error: "Current HTML and instruction are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = getAnthropicClient();
    const messages = buildIterationMessages(currentHtml, instruction);

    console.log(`[iterate] Calling Claude (model: ${MODEL}) with iteration request...`);
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      system: ITERATION_SYSTEM_PROMPT,
      messages,
    });
    console.log(`[iterate] Stream created in ${Date.now() - startTime}ms`);

    const encoder = new TextEncoder();
    let chunkCount = 0;
    let totalChars = 0;

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              chunkCount++;
              totalChars += event.delta.text.length;
              if (chunkCount % 50 === 0) {
                console.log(`[iterate] Streaming... chunks=${chunkCount}, chars=${totalChars}, elapsed=${Date.now() - startTime}ms`);
              }
              const data = JSON.stringify({ text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          console.log(`[iterate] Stream complete: ${chunkCount} chunks, ${totalChars} chars, ${Date.now() - startTime}ms total`);
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error(`[iterate] Stream error after ${chunkCount} chunks:`, error);
          const errorData = JSON.stringify({
            error: "Iteration failed",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error(`[iterate] Fatal error after ${Date.now() - startTime}ms:`, error);
    return new Response(
      JSON.stringify({ error: "Failed to start iteration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
