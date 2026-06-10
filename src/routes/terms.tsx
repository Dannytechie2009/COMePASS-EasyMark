import { createFileRoute } from "@tanstack/react-router";
import { LegalView } from "./privacy";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Use — COMePASS Prevarsity" },
      { name: "description", content: "The rules and conditions for using COMePASS Prevarsity." },
    ],
  }),
});

function TermsPage() {
  return <LegalView kind="terms" title="Terms of Use" />;
}
