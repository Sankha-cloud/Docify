"use client";

import { useOthers, useSelf } from "@liveblocks/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MAX = 4;

export function AvatarStack() {
  const others = useOthers();
  const self = useSelf();

  const visible = others.slice(0, MAX);
  const extra = others.length - visible.length;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((user) => (
        <Tooltip key={user.connectionId}>
          <TooltipTrigger
            render={
              <Avatar
                className="size-7 border-2 border-background"
                style={{ outline: `2px solid ${user.info.color}` }}
              />
            }
          >
            {user.info.avatar && <AvatarImage src={user.info.avatar} />}
            <AvatarFallback>
              {user.info.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </TooltipTrigger>
          <TooltipContent>{user.info.name}</TooltipContent>
        </Tooltip>
      ))}
      {extra > 0 && (
        <div className="flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
          +{extra}
        </div>
      )}
      {self && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Avatar
                className="ml-3 size-7 border-2 border-background"
                style={{ outline: `2px solid ${self.info.color}` }}
              />
            }
          >
            {self.info.avatar && <AvatarImage src={self.info.avatar} />}
            <AvatarFallback>
              {self.info.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </TooltipTrigger>
          <TooltipContent>You</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
