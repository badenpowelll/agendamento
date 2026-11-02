"use client";

import { useTransition } from "react";
import { exportMyData } from "@/app/actions/customer";
import { Button } from "./ui";

export function ExportDataButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const json = await exportMyData();
          if (!json) return;
          const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
          const a = document.createElement("a");
          a.href = url;
          a.download = "meus-dados.json";
          a.click();
          URL.revokeObjectURL(url);
        })
      }
    >
      {pending ? "Gerando…" : "Baixar meus dados"}
    </Button>
  );
}
