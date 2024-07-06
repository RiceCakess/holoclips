import React, { useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { VirtuosoLoadingFooter } from "@/components/common/Loading";
import { useChannels } from "@/services/channel.service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shadcn/ui/select";
import { orgAtom } from "@/store/org";
import { ChannelCard } from "@/components/channel/ChannelCard";
import { Button } from "@/shadcn/ui/button";
import { cn } from "@/lib/utils";

// Types
type DisplayStyle = "grid" | "list";
type SortOption = "suborg" | "subscriber_count" | "view_count";
type GroupOption = "none" | "group";

// Atoms and constants
const orgChannelDisplayStyleAtom = atomWithStorage<DisplayStyle>(
  "orgChannelDisplayStyle",
  window.innerWidth > 498 ? "grid" : "list",
);

const orgChannelSortByAtom = atomWithStorage<SortOption>(
  "orgChannelSortBy",
  "suborg",
);
const orgChannelGroupByAtom = atomWithStorage<GroupOption>(
  "orgChannelGroupBy",
  "none",
);

const sortOptions: { value: SortOption; label: string; icon: string }[] = [
  { value: "suborg", label: "Standard Sort", icon: "i-lucide:arrow-down-a-z" },
  {
    value: "subscriber_count",
    label: "Subscribers",
    icon: "i-lucide:users",
  },
  {
    value: "view_count",
    label: "Views",
    icon: "i-lucide:eye",
  },
];

const groupOptions: {
  value: GroupOption;
  label: string;
  icon: string;
}[] = [
  { value: "none", label: "No Grouping", icon: "i-lucide:user" },
  { value: "group", label: "Group", icon: "i-lucide:users" },
];

// Channel component
const ChannelComponent: React.FC<{
  channel: Channel;
  displayStyle: DisplayStyle;
}> = ({ channel, displayStyle }) => {
  return (
    <ChannelCard
      size={displayStyle === "grid" ? "lg" : "sm"}
      {...channel}
      key={`channel-${channel.id}`}
    />
  );
};

// Group component
const GroupComponent: React.FC<{
  group: string;
  channels: Channel[];
  displayStyle: DisplayStyle;
}> = ({ group, channels, displayStyle }) => {
  return (
    <React.Fragment>
      {group && <h2 className="mb-4 mt-6 text-xl font-bold">{group}</h2>}
      {displayStyle === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,_minmax(240px,_1fr))] gap-4">
          {channels.map((channel) => (
            <ChannelComponent
              key={channel.id}
              channel={channel}
              displayStyle={displayStyle}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {channels.map((channel) => (
            <div key={channel.id} className="py-1">
              <ChannelComponent channel={channel} displayStyle={displayStyle} />
            </div>
          ))}
        </div>
      )}
    </React.Fragment>
  );
};

// Main ChannelsOrg component
export default function ChannelsOrg() {
  const { t } = useTranslation();
  const { org } = useParams();
  const currentOrg = useAtomValue(orgAtom);

  const [displayStyle, setDisplayStyle] = useAtom(orgChannelDisplayStyleAtom);
  const [sortBy, setSortBy] = useAtom(orgChannelSortByAtom);
  const [groupBy, setGroupBy] = useAtom(orgChannelGroupByAtom);

  const {
    data: channels,
    fetchNextPage: fetchChannels,
    isFetchingNextPage,
    hasNextPage,
  } = useChannels({
    org,
    sort: sortBy,
    order:
      sortBy === "subscriber_count" || sortBy === "view_count" ? "desc" : "asc",
  });

  const sortedAndGroupedChannels = useMemo(() => {
    const processedChannels = channels?.pages.flat() ?? [];

    // Group channels
    if (groupBy === "group" && sortBy === "suborg") {
      const groupedChannels: Record<string, Channel[]> = {};
      processedChannels.forEach((channel) => {
        const group = channel.group || "Other";
        if (!groupedChannels[group]) {
          groupedChannels[group] = [];
        }
        groupedChannels[group].push(channel);
      });

      // Sort groups internally by suborg
      Object.keys(groupedChannels).forEach((group) => {
        groupedChannels[group].sort((a, b) =>
          (a.suborg || "").localeCompare(b.suborg || ""),
        );
      });

      return groupedChannels;
    }

    return { "": processedChannels };
  }, [channels, sortBy, groupBy]);

  return (
    <>
      <Helmet>
        <title>
          {currentOrg} {t("component.mainNav.channels")} - Holodex
        </title>
      </Helmet>
      <div className="h-full w-full px-4 md:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          {/* Controls */}
          <div className="flex gap-1">
            <Button
              variant={displayStyle === "grid" ? "default" : "base-outline"}
              size="icon-lg"
              className="h-9 w-9"
              onClick={() => setDisplayStyle("grid")}
            >
              <span className="i-lucide:layout-grid text-base" />
            </Button>
            <Button
              variant={displayStyle === "list" ? "default" : "base-outline"}
              size="icon-lg"
              className="h-9 w-9"
              onClick={() => setDisplayStyle("list")}
            >
              <span className="i-lucide:list text-base" />
            </Button>
          </div>

          <Select
            value={sortBy}
            onValueChange={(value: SortOption) => {
              setSortBy(value);
              if (value !== "suborg") {
                setGroupBy("none");
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <span className={cn(option.icon, "text-base")} />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={groupBy}
            onValueChange={(value: GroupOption) => setGroupBy(value)}
            disabled={sortBy !== "suborg"}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              {groupOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <span className={cn(option.icon, "text-base")} />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          {Object.entries(sortedAndGroupedChannels).map(
            ([group, channelsInGroup]) => (
              <GroupComponent
                key={group}
                group={group}
                channels={channelsInGroup}
                displayStyle={displayStyle}
              />
            ),
          )}
        </div>
        {hasNextPage && (
          <VirtuosoLoadingFooter
            context={{
              size: "sm",
              isLoading: isFetchingNextPage,
              hasNextPage: hasNextPage ?? false,
              loadMore: fetchChannels,
              autoload: true,
            }}
          />
        )}
      </div>
    </>
  );
}
