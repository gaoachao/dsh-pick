import type { Context } from '@deepseek-ai/cordis';

export const name = 'dsh-pick';

/**
 * Installable host entry. The browser bridge is available separately; DSH UI integration is pending.
 * Add host capabilities through ctx and declare their required services in inject.
 */
export function apply(ctx: Context): void {
  ctx.logger(name).info('Host loaded; the Vite picker preview is available. DSH conversation integration is pending.');
}
