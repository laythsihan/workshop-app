"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type FaqItem = {
  question: string;
  answer: string;
};

type Props = {
  items: FaqItem[];
};

function FaqAccordionItem({ item }: { item: FaqItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-[#D9D3C7]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-label-md font-medium text-[#1A1917]">
          {item.question}
        </span>
        {isOpen ? (
          <ChevronUp className="size-4 shrink-0 text-[#9E9892]" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-[#9E9892]" />
        )}
      </button>
      {isOpen && (
        <div className="pb-4 pt-0">
          <p className="text-body-sm leading-relaxed text-[#6B6560]">
            {item.answer}
          </p>
        </div>
      )}
    </div>
  );
}

export function FaqAccordion({ items }: Props) {
  return (
    <div className="divide-y-0">
      {items.map((item, index) => (
        <FaqAccordionItem key={index} item={item} />
      ))}
    </div>
  );
}
