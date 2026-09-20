import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import next from "ultracite/oxlint/next";
import nextJsPlugins from "ultracite/oxlint/next/js-plugins";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";

const jsPlugins = selectJsPlugins(["react-doctor"]);

export default defineConfig({
  extends: [core, react, next, nextJsPlugins, shadcn, antiSlop, jsPlugins],
  ignorePatterns: core.ignorePatterns,
  jsPlugins: [...(jsPlugins.jsPlugins ?? []), ...(shadcn.jsPlugins ?? [])],
  overrides: [
    {
      files: ["emails/**/*.tsx"],
      // Email clients require inline styles; these components are not shadcn UI.
      rules: { "shadcn/no-inline-styles": "off" },
    },
    {
      files: ["lib/*.test.ts"],
      // Mock only external SDKs and Next's server-only marker, never application logic.
      rules: { "anti-slop/no-module-mocking": "off" },
    },
    {
      files: ["components/ui/**/*.tsx"],
      rules: {
        // shadcn intentionally co-locates component variant helpers.
        "react-doctor/only-export-components": "off",
      },
    },
  ],
  rules: {
    "jsdoc/check-tag-names": ["error", { definedTags: ["remarks"] }],
  },
  settings: jsPluginSettings,
});
