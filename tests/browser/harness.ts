import { replayAll } from '../replay/streams';

/** Runs the recorded streams inside this browser's JavaScript engine. */
declare global {
  interface Window { __replayAll?: () => Record<string, string[]> }
}
window.__replayAll = replayAll;
