"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { X, Tag as TagIcon } from "lucide-react";
import { cn } from "../lib/utils";

interface TagAutocompleteProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagAutocomplete({
  value,
  onChange,
  placeholder = "Add tags...",
  className,
}: TagAutocompleteProps) {
  const { user } = useUser();
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get all existing tags
  const allTags = useQuery(
    api.documents.getAllTags,
    user ? { userId: user.id } : "skip"
  ) || [];

  // Filter suggestions based on input
  const suggestions = inputValue.trim()
    ? allTags.filter(tag =>
        tag.toLowerCase().includes(inputValue.toLowerCase()) &&
        !value.includes(tag)
      ).slice(0, 5)
    : allTags.filter(tag => !value.includes(tag)).slice(0, 5);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.includes(trimmedTag)) {
      onChange([...value, trimmedTag]);
      setInputValue("");
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addTag(suggestions[selectedIndex]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
      setShowSuggestions(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const handleInputFocus = () => {
    if (inputValue.trim() || suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="flex flex-wrap gap-2 p-2 min-h-[42px] border border-input rounded-md bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="gap-1 pr-1"
          >
            <TagIcon className="h-3 w-3" />
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
              aria-label={`Remove ${tag} tag`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
          {suggestions.map((tag, index) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none",
                index === selectedIndex && "bg-accent"
              )}
            >
              <div className="flex items-center gap-2">
                <TagIcon className="h-3 w-3 text-muted-foreground" />
                <span>{tag}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Show option to create new tag if input doesn't match */}
      {showSuggestions &&
        inputValue.trim() &&
        !suggestions.some(
          tag => tag.toLowerCase() === inputValue.trim().toLowerCase()
        ) && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
            <button
              type="button"
              onClick={() => addTag(inputValue)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none flex items-center gap-2"
            >
              <TagIcon className="h-3 w-3 text-muted-foreground" />
              <span>Create "{inputValue.trim()}"</span>
            </button>
          </div>
        )}
    </div>
  );
}

