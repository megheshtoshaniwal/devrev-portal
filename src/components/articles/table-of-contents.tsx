"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { cn } from "@/portal/utils/utils";
import {
  type TOCItem,
  type TOCItemGroup,
  getTocItemGroups,
  getUniqueKey,
} from "@/devrev-sdk/articles/toc";

interface TableOfContentsProps {
  items: TOCItem[];
  className?: string;
}

const ACTIVE_ITEM_UPDATE_DELAY_MS = 1000;

export function TableOfContents({ items, className }: TableOfContentsProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeItemKey, setActiveItemKey] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const groups = useMemo(() => getTocItemGroups(items), [items]);

  const handleClick = useCallback((item: TOCItem) => {
    // Expand group if clicking a parent
    setExpandedItems((prev) => {
      const key = getUniqueKey(item);
      if (prev.has(key)) return prev;
      return new Set(prev).add(key);
    });

    // Scroll to heading
    const { href, level, label } = item;
    if (href) {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: "smooth" });
      window.history.pushState(null, "", href);
    } else {
      const headings = document.querySelectorAll(`h${level}`);
      for (const heading of headings) {
        if (heading.textContent === label) {
          heading.scrollIntoView({ behavior: "smooth" });
          window.history.pushState(null, "", `#${encodeURIComponent(label)}`);
          break;
        }
      }
    }

    setTimeout(
      () => setActiveItemKey(getUniqueKey(item)),
      ACTIVE_ITEM_UPDATE_DELAY_MS
    );
  }, []);

  // IntersectionObserver for scroll tracking
  useEffect(() => {
    if (groups.length === 0) return;

    const findElement = (item: TOCItem) => {
      if (item.href?.slice(1)) {
        const el = document.getElementById(item.href.slice(1));
        if (el) return el;
      }
      const elements = document.querySelectorAll(`h${item.level}`);
      return Array.from(elements).find((el) =>
        el.textContent?.includes(item.label)
      );
    };

    const callback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target;
          groups.forEach((group) => {
            [group, ...group.children].forEach((el) => {
              if (
                el.label === target.textContent ||
                el.href === `#${target.id}`
              ) {
                setActiveItemKey(getUniqueKey(el));
                setExpandedItems((prev) => {
                  const key = getUniqueKey(group);
                  return prev.has(key) ? prev : new Set(prev).add(key);
                });
              }
            });
          });
        }
      });
    };

    observerRef.current = new IntersectionObserver(callback, {
      root: null,
      rootMargin: "0px 0px -75% 0px",
      threshold: 0,
    });

    groups.forEach((group) => {
      [group, ...group.children].forEach((item) => {
        const el = findElement(item);
        if (el) observerRef.current?.observe(el);
      });
    });

    // Set first item as active
    if (groups.length > 0) setActiveItemKey(getUniqueKey(groups[0]));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [groups]);

  if (groups.length === 0) return null;

  return (
    <nav className={cn("flex flex-col", className)}>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        On this page
      </p>
      {groups.map((group, i) => (
        <TocGroup
          key={i + getUniqueKey(group)}
          group={group}
          activeItemKey={activeItemKey}
          isExpanded={expandedItems.has(getUniqueKey(group))}
          onClick={handleClick}
        />
      ))}
    </nav>
  );
}

function TocGroup({
  group,
  activeItemKey,
  isExpanded,
  onClick,
}: {
  group: TOCItemGroup;
  activeItemKey: string | null;
  isExpanded: boolean;
  onClick: (item: TOCItem) => void;
}) {
  return (
    <>
      <TocEntry
        item={group}
        isActive={getUniqueKey(group) === activeItemKey}
        onClick={() => onClick(group)}
      />
      {isExpanded &&
        group.children.map((child, i) => (
          <TocEntry
            key={i + getUniqueKey(child)}
            item={child}
            isActive={getUniqueKey(child) === activeItemKey}
            onClick={() => onClick(child)}
          />
        ))}
    </>
  );
}

function TocEntry({
  item,
  isActive,
  onClick,
}: {
  item: TOCItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const indent = (item.normalizedLevel ?? 1) - 1;

  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left py-1.5 text-sm leading-snug transition-colors cursor-pointer",
        indent > 0 && "border-l-2 ml-0",
        indent > 0 && (isActive ? "border-primary" : "border-border"),
        isActive
          ? "text-primary font-medium"
          : "text-muted-foreground hover:text-foreground"
      )}
      style={{ paddingLeft: `${indent * 16}px` }}
    >
      <span className="line-clamp-1">{item.label}</span>
    </button>
  );
}
