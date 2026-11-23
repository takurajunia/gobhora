"use client";

import { useActionState } from "react";
import { createFixture, type FixtureFormState } from "./actions";

type Option = { id: number; name: string };
type Props = { leagueSlug: string; teams: Option[]; venues: Option[] };

const initialState: FixtureFormState = { error: null };
const field =
  "mt-1 h-[52px] w-full rounded-[14px] border border-line bg-white px-4 text-base outline-none focus:border-brand";

export function FixtureForm({ leagueSlug, teams, venues }: Props) {
  const [state, formAction, pending] = useActionState(
    createFixture,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="league" value={leagueSlug} />

      <label className="block">
        <span className="text-sm font-semibold">Home team</span>
        <select name="home" required defaultValue="" className={field}>
          <option value="" disabled>
            Choose…
          </option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-semibold">Away team</span>
        <select name="away" required defaultValue="" className={field}>
          <option value="" disabled>
            Choose…
          </option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-semibold">Date</span>
          <input name="date" type="date" required className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Kick-off</span>
          <input
            name="time"
            type="time"
            required
            defaultValue="15:00"
            className={field}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-semibold">Matchweek</span>
          <input
            name="matchweek"
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            className={field}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Venue</span>
          <select name="venue" defaultValue="" className={field}>
            <option value="">Not set</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-xl bg-loss/10 px-3 py-2 text-sm font-semibold text-loss"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-14 w-full rounded-full bg-brand text-lg font-bold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save fixture"}
      </button>
    </form>
  );
}
