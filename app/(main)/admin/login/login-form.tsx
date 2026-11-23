"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="text-sm font-semibold">Phone number</span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="username"
          placeholder="077 123 4567"
          required
          className="mt-1 h-[52px] w-full rounded-[14px] border border-line bg-white px-4 text-base outline-none focus:border-brand"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 h-[52px] w-full rounded-[14px] border border-line bg-white px-4 text-base outline-none focus:border-brand"
        />
      </label>
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
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
