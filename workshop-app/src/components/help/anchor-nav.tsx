"use client";

import { useEffect, useState } from "react";
import { cn } from "workshop/lib/utils";

type Section = {
  id: string;
  label: string;
};

type Props = {
  sections: Section[];
};

export function HelpAnchorNav({ sections }: Props) {
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0px -70% 0px",
        threshold: 0,
      }
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [sections]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setActiveSection(id);
    }
  };

  return (
    <nav className="sticky top-6 mb-8 hidden min-[1100px]:block">
      <ul className="flex gap-4 border-b border-[#D9D3C7] pb-4">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              onClick={(e) => handleClick(e, section.id)}
              className={cn(
                "text-label-sm transition-colors duration-150",
                activeSection === section.id
                  ? "font-medium text-[#B5763A]"
                  : "text-[#6B6560] hover:text-[#1A1917]"
              )}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
