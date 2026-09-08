import type { Context } from '@deepseek-ai/cordis';

export const name = 'dsh-pick';

/**
 * Installable host entry. Browser picking and agent delivery are the next milestone.
 * Add host capabilities through ctx and declare their required services in inject.
 */
export function apply(ctx: Context): void {
  ctx.logger(name).info('Development scaffold loaded; element picking is not implemented yet.');
}
