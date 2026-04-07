// config.ts — wraps @caffeineai/core-infrastructure's createActorWithConfig
// with the app-specific Backend createActor function pre-applied.
// CRITICAL: Never use InternetIdentityProvider here.

import {
  createActorWithConfig as _createActorWithConfig,
  type CreateActorOptions,
} from "@caffeineai/core-infrastructure";
import { type Backend, createActor } from "./backend";

export type { CreateActorOptions };

/**
 * Creates a Backend actor with proper config loaded from env.json.
 * Pass agentOptions.identity for authenticated calls.
 */
export async function createActorWithConfig(
  options?: CreateActorOptions,
): Promise<Backend> {
  return _createActorWithConfig(createActor, options);
}
