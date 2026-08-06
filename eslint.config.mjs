import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "off",
      // A parameter can be required by a signature and still unused — a route
      // handler that ignores `request`, a map callback that ignores the index.
      // An underscore prefix marks that as deliberate; anything else is dead
      // code and stays an error.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // shadcn/ui components are generated; their empty wrapper interfaces are
    // intentional extension points.
    files: ["src/components/ui/**"],
    rules: { "@typescript-eslint/no-empty-object-type": "off" },
  },
];

export default eslintConfig;
