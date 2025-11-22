import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Calendar, MapPin, Camera, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PhotoFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  availableTags: string[];
  onReset: () => void;
}

export const PhotoFilters = ({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  selectedTags,
  onTagToggle,
  availableTags,
  onReset,
}: PhotoFiltersProps) => {
  const hasActiveFilters = searchQuery || selectedTags.length > 0 || sortBy !== "date-desc";

  return (
    <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search photos by caption, title, or tags..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Newest First
              </div>
            </SelectItem>
            <SelectItem value="date-asc">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Oldest First
              </div>
            </SelectItem>
            <SelectItem value="location">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                By Location
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="outline" onClick={onReset}>
            <X className="w-4 h-4 mr-2" />
            Reset
          </Button>
        )}
      </div>

      {availableTags.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            Filter by AI Tags
          </div>
          <div className="flex flex-wrap gap-2">
            {availableTags.slice(0, 20).map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer hover:scale-105 transition-transform"
                onClick={() => onTagToggle(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {selectedTags.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Active filters:</span>
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => onTagToggle(tag)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};