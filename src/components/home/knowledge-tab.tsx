import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import type { DirectoryNode } from "@/devrev-sdk/client";

interface KnowledgeTabProps {
  directories: DirectoryNode[];
  basePath: string;
}

export function KnowledgeTab({ directories, basePath }: KnowledgeTabProps) {
  return (
    <div className="space-y-2 pt-1">
      <h3 className="text-[13px] font-semibold text-foreground mb-3">Browse topics</h3>
      {directories.slice(0, 6).map((node, i) => (
        <Link
          key={node.directory.id}
          href={`${basePath}/directories/${node.directory.display_id}`}
          className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted/60 transition-colors group animate-slide-up"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors truncate">
              {node.directory.title}
            </p>
            {node.directory.description && (
              <p className="text-[11px] text-muted-foreground truncate">
                {node.directory.description}
              </p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </Link>
      ))}
    </div>
  );
}
