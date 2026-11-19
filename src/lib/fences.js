/**
 * stripJsonFences(buffer) — remove a markdown code fence wrapped around a
 * (possibly still-streaming) JSON payload.
 *
 * Why: without `response_format: json_object`, gpt-oss models occasionally
 * wrap their JSON in ```json … ``` fences. We dropped json_object mode on
 * purpose — measured on openai/gpt-oss-120b it delivers the whole completion
 * as ONE content delta at the end, which kills progressive rendering, while
 * prompt-enforced JSON streams ~100 deltas. This helper makes the client
 * accumulator tolerant of fences so partial-json can parse either way.
 *
 * Behaviour:
 *   - No leading fence → buffer returned untouched (zero risk to clean JSON,
 *     including backticks inside string values).
 *   - Leading ``` or ```json (any language tag, any leading whitespace) is
 *     stripped, along with a trailing fence — including a PARTIAL trailing
 *     fence (`, ``) that can appear mid-stream before the last chunk lands.
 *
 * Pure function; unit-tested in fences.test.js.
 */
export function stripJsonFences(buffer) {
  if (typeof buffer !== 'string' || !buffer) return buffer || '';
  const lead = buffer.match(/^\s*```[a-zA-Z]*[ \t]*\r?\n?/);
  if (!lead) return buffer;
  return buffer.slice(lead[0].length).replace(/\s*`{1,3}\s*$/, '');
}
