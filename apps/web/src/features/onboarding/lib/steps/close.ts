/**
 * Checklist item 4 — close it and see the stats.
 *
 * Starts on `/positions/$positionId` and lands on `/dashboard`, so the last
 * thing this walkthrough does is show the user their own figures on the screen
 * that was empty when they started.
 *
 * EVERY CLAIM, AND WHERE IT WAS CHECKED:
 * - `FillDialog` offers Type Exit once the position is open, alongside Price,
 *   Quantity, Fees and Date & Time; a position can carry several exit fills,
 *   which is what a partial exit is.
 * - THE EXIT THAT BALANCES THE ENTRY CLOSES THE POSITION ITSELF. `addFill` in
 *   `positions.service.ts` runs `closePositionTx` in the same transaction once
 *   the exit quantity reconciles with the entry quantity, stamping `closedAt`
 *   from that fill's own timestamp. So in the ordinary flow nobody presses
 *   "Close Position": it renders only while the position is open, and it is
 *   disabled until the full quantity is exited ("Exit the full quantity first"),
 *   which is the same moment the automatic close fires. What is left for it is
 *   the position that reached zero open units by a path that does not
 *   auto-close, which is editing a fill afterwards: `editFill` recomputes the
 *   quantities and does not close, so correcting a partial exit up to the full
 *   size leaves an open position with nothing outstanding. `positions.test.ts`
 *   pins that path as the reason the close route survives the auto-close.
 * - REALISED P&L DOES NOT WAIT FOR THE CLOSE. Every fill runs the fill hook,
 *   which posts the realised delta to the ledger (`postFillLedgerEntries`), so a
 *   partial exit moves the balance the moment it is recorded. The close hook
 *   posts only what is still unposted, which on a one-entry-one-exit trade is
 *   nothing. The account balance is `startingBalance + SUM(ledger)`.
 * - A PARTIAL EXIT IS A SUPPORTED PATH THROUGH THIS SET, because step 1 invites
 *   one. It does not close the position, so step 2's `closed` signal never
 *   arrives and Close Position stays disabled — which used to leave Escape as
 *   the only way on. `tour-engine.ts` now releases the "Next" gate on a step
 *   whose control is disabled, so step 2 is a step the user reads and moves
 *   past rather than a dead end, and its copy says so. Nothing here claims the
 *   position closed: the last step attributes the figures to the exits
 *   recorded, which is true of a partial exit and of a full one alike.
 * - THE CLOSING STEP IS CENTRED, NOT ANCHORED TO THE GRID, and the partial exit
 *   is why. A full exit completes the last core setup step, so the dashboard
 *   greets the user with the populated grid; a partial exit leaves item 4
 *   outstanding, and the dashboard (correctly) still shows the focused welcome
 *   view — no `[data-grid-mode]` anywhere. A step anchored to the grid waited
 *   out its `waitForMs` on that path and ended the walkthrough `target-missing`
 *   one step from the finish. Centred, the aside opens over whichever dashboard
 *   the user's data has earned, and its copy is written to be true of both.
 */

import type { WalkthroughStepSource } from './index';

export const closeSteps: readonly WalkthroughStepSource[] = [
  {
    target: '[data-tour="position-add-fill"]',
    route: '/positions/$positionId',
    routeParams: ['positionId'],
    docs: 'positions',
    // The set is entered COLD, on a route that has to be navigated to, and
    // `PositionDetail` renders skeletons until `usePosition` resolves. Without
    // this the tour exits `target-missing` before the position has loaded.
    waitForMs: 5000,
    // ABOVE THE BUTTON, NOT BESIDE IT — the same placement, for the same reason,
    // as the position set's draft step, which highlights this same control. The
    // exit fill this step waits for is recorded in the fill dialog, and the
    // default placement to the LEFT of Add Fill reaches x=850 at 1280x720 while
    // the dialog runs to x=896, covering 21px of that dialog's Add button.
    // ABOVE, AND THE STEP IS WRITTEN TO A HEIGHT BUDGET BECAUSE OF IT. This
    // anchor is the most cramped in any set, and both of its states are measured:
    // to the LEFT the popover clears the button but lands on the fill dialog it
    // just told the user to open, and BELOW or RIGHT it leaves the viewport. That
    // leaves above, where driver.js pins the popover's top at y=386 over a button
    // at y=554 — 168px, for the title, the body, the "read more" line and the
    // line naming the action. The body is one line for that reason, not for
    // style: a second one puts the popover on the button. The quantity nuance it
    // used to carry is the whole subject of the next step.
    // LEFT AND NARROW, AND BOTH HALVES ARE MEASURED. This anchor is the most
    // cramped in any set: "Add Fill" sits at the bottom right of the page and
    // opens a dialog centred beside it, so the step is asserted clear in two
    // states. At the full 300px width nothing satisfies both — above lands 12px
    // inside the button, below and right leave the viewport, and left reaches
    // x=862 across a dialog running to x=896. At 240px the left side fits: the
    // popover starts at x=922, clear of the dialog and clear of the button.
    side: 'left',
    align: 'end',
    narrow: true,
    actionHintKey: 'walk.close.1.actionHint',
    advanceOnAction: true,
    titleKey: 'walk.close.1.title',
    bodyKey: 'walk.close.1.body',
  },
  {
    target: '[data-tour="position-close"]',
    route: '/positions/$positionId',
    routeParams: ['positionId'],
    docs: 'positions',
    waitForMs: 3000,
    actionHintKey: 'walk.close.2.actionHint',
    advanceOnAction: true,
    titleKey: 'walk.close.2.title',
    bodyKey: 'walk.close.2.body',
  },
  {
    // No target — see the header: a partial exit leaves the dashboard on its
    // welcome view, where the grid this step used to anchor to does not exist.
    route: '/dashboard',
    docs: 'gettingStarted',
    titleKey: 'walk.close.3.title',
    bodyKey: 'walk.close.3.body',
  },
];
