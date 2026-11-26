"use client";

import { useEffect, useId, useState } from "react";

const BUILDER_ACCORDION_EVENT = "kebu-builder-accordion-open";

type AccordionDetail = {
  group: string;
  id: string;
};

export function useBuilderAccordion(group: string | undefined, defaultOpen: boolean) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!group) return;
    const onOtherOpen = (event: Event) => {
      const detail = (event as CustomEvent<AccordionDetail>).detail;
      if (!detail || detail.group !== group || detail.id === id) return;
      setOpen(false);
    };
    window.addEventListener(BUILDER_ACCORDION_EVENT, onOtherOpen);
    return () => window.removeEventListener(BUILDER_ACCORDION_EVENT, onOtherOpen);
  }, [group, id]);

  const setAccordionOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && group) {
      window.dispatchEvent(
        new CustomEvent<AccordionDetail>(BUILDER_ACCORDION_EVENT, {
          detail: { group, id },
        }),
      );
    }
  };

  return { open, setAccordionOpen };
}
