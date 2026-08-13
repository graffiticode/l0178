// SPDX-License-Identifier: MIT
// L0178's Form: renders the compiled Data API job, or compile errors. Injected into the
// shared View (from @graffiticode/l0000-view), which supplies `state.data`,
// `state.errors`, and `state.apply`.
//
// Renders raw JSON for now — there is no job to render yet, and L0003's primitive
// renderers (hello / image / print) were removed with the keywords that produced them.
// When the vocabulary exists this should follow L0177's Form, which renders the DESIGN:
// the target of the job, whether it is complete, the warnings in compiler order, and
// every request field beside the exact API path it resolves to.
import "../../index.css";
import { useState, useEffect } from "react";
import type { FormProps, CompileError } from "@graffiticode/l0000-view";
import { ThemeToggle } from "./ThemeToggle";

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

function renderErrors(errors: CompileError[], theme: string | undefined) {
  return (
    <div className="flex flex-col gap-2">
      {errors.map((error, i) => (
        <div
          key={i}
          className={classNames(
            "rounded-md p-3 border text-sm",
            theme === "dark"
              ? "bg-red-900/50 border-red-700 text-red-200"
              : "bg-red-50 border-red-200 text-red-800",
          )}
        >
          {error.message}
        </div>
      ))}
    </div>
  );
}

function renderJSON(data: any) {
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    // Discarded on purpose: `schema` and `theme` are envelope, not job content.
    const { schema: _schema, theme: _theme, ...rest } = data;
    return <pre className="text-xs">{JSON.stringify(rest, null, 2)}</pre>;
  }
  return <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>;
}

function renderData(data: any) {
  // A themed scalar/list body is wrapped under `value`; named records are merged inline.
  const source = data?.value ?? data;
  return renderJSON(source);
}

export const Form = ({ state }: FormProps) => {
  const errors: CompileError[] = state.errors ?? [];
  const source = state.data;
  const initialTheme =
    typeof source === "object" && source !== null && !Array.isArray(source)
      ? source.theme
      : undefined;
  const [theme, setTheme] = useState(initialTheme ?? state.data?.theme);

  useEffect(() => {
    state.apply({ type: "update", args: { theme } });
  }, [theme]);

  return (
    <div
      className={classNames(
        (theme === "dark" && "bg-zinc-900 text-white") || "bg-white text-zinc-900",
        "rounded-md font-mono flex flex-col gap-4 p-4",
      )}
    >
      {theme !== undefined && <ThemeToggle theme={theme} setTheme={setTheme} />}
      {errors.length > 0 ? renderErrors(errors, theme) : renderData(state.data)}
    </div>
  );
};
