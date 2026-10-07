"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/components/i18n";

type Props = {
  text: string;
  contentType?: "ui" | "dynamic" | "spiritual" | "system";
  className?: string;
};

export function LocalizedText({ text, contentType = "dynamic", className }: Props) {
  const { locale, translateText } = useTranslation();
  const [value, setValue] = useState(text);

  useEffect(() => {
    let active = true;
    setValue(text);
    if (!text.trim() || locale === "pt-AO") return;
    void translateText(text, contentType).then((translated) => {
      if (active) setValue(translated);
    });
    return () => { active = false; };
  }, [text, locale, contentType, translateText]);

  return <span className={className}>{value}</span>;
}
