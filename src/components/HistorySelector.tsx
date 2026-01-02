import { useState } from "react";
import { History, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type HistoryType = 'solo' | 'multi';

interface HistorySelectorProps {
  currentType: HistoryType;
  onTypeChange: (type: HistoryType) => void;
}

export const HistorySelector = ({ currentType, onTypeChange }: HistorySelectorProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-xs"
        >
          <History className="h-4 w-4" />
          Historique : {currentType === 'solo' ? 'Solo' : 'Multi'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem 
          onClick={() => onTypeChange('solo')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <User className="h-4 w-4" />
          Conversations Solo
          {currentType === 'solo' && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onTypeChange('multi')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Users className="h-4 w-4" />
          Conversations Multi
          {currentType === 'multi' && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
