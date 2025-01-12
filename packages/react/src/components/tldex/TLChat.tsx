import { useSocket } from "@/hooks/useSocket";
import { formatDuration } from "@/lib/time";
import { cn, getChannelPhoto } from "@/lib/utils";
import { Badge } from "@/shadcn/ui/badge";
import { playerRefAtom, videoStatusAtomFamily } from "@/store/player";
import { tldexBlockedAtom, tldexSettingsAtom } from "@/store/tldex";
import { useAtom, useAtomValue } from "jotai";
import {
  DetailedHTMLProps,
  HTMLAttributes,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import "./tlchat.css";

interface TLChatProps {
  videoId: string;
}
// Custom hook for timestamp indexing
function useTimestampIndex(messages?: ParsedMessage[]) {
  // Build and memoize the timestamp index
  return useMemo(() => {
    const findIndexForTimestamp = (targetTimestamp: number) => {
      if (!messages) return 0;

      let left = 0;
      let right = messages.length - 1;

      // Handle edge cases
      if (right < 0) return 0;
      if (targetTimestamp <= messages[0].video_offset) return 0;
      if (targetTimestamp >= messages[right].video_offset) return right;

      // Binary search for closest match
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const midTimestamp = messages[mid].video_offset;

        if (midTimestamp === targetTimestamp) {
          return mid;
        }

        if (midTimestamp < targetTimestamp) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }

      // Find closest between the two surrounding values
      return messages[right].video_offset <= targetTimestamp ? right : left;
    };

    return findIndexForTimestamp;
  }, [messages]);
}

export function TLChat({ videoId }: TLChatProps) {
  const tldexState = useAtomValue(tldexSettingsAtom);
  const roomID = useMemo(
    () => `${videoId}/${tldexState.liveTlLang}` as RoomIDString,
    [videoId, tldexState.liveTlLang],
  );
  const { chatDB } = useSocket(roomID);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const processedMessages = useMemo(() => {
    return chatDB.messages?.map((msg, i, arr) => ({
      ...msg,
      showHeader:
        i === 0 || // This condition checks if the current message is the first one in the array.
        arr[i - 1]?.name !== msg.name || // This condition checks if the previous message's name is different from the current message's name.
        (i > 5 && arr[i - 5]?.name === msg.name), // This condition checks if the message 5 positions back in the array has the same name as the current message
    }));
  }, [chatDB.messages]);

  // inverse index of timestamp to index of message
  const findIndexForTimestamp = useTimestampIndex(processedMessages);

  // scroll to the video:
  const videoStatusAtom = videoStatusAtomFamily(videoId);
  const videoStatus = useAtomValue(videoStatusAtom);

  useEffect(() => {
    if (videoStatus?.progress === undefined || videoStatus.status !== "playing")
      return;
    const index = findIndexForTimestamp(videoStatus.progress);
    virtuosoRef.current?.scrollToIndex({
      index: index || "LAST",
      align: "end",
    });
  }, [findIndexForTimestamp, videoStatus.progress, videoStatus.status]);

  return (
    <Virtuoso
      ref={virtuosoRef}
      components={{ Item: TLChatItem }}
      className="h-full w-full bg-base-2 py-2"
      initialTopMostItemIndex={{ index: "LAST", align: "end" }}
      // firstItemIndex={chatDB.messages?.length ? 30 : 0}
      alignToBottom
      followOutput="smooth"
      startReached={() => chatDB.loadMessages({ partial: 30 })}
      data={processedMessages}
      itemContent={(_, { key, ...message }) => (
        <TLChatMessage {...message} key={key} />
      )}
    />
  );
}

const TLChatItem = forwardRef<
  HTMLDivElement,
  DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>
>((props, ref) => (
  <div
    {...props}
    className={cn(props.className, "border-b-0 border-base-4 last:border-b-0")}
    ref={ref}
  />
));

function TLChatMessage({
  message,
  parsed,
  name,
  video_offset,
  is_owner,
  is_verified,
  is_vtuber,
  is_moderator,
  channel_id,
  showHeader,
}: ParsedMessage & { showHeader?: boolean }) {
  const playerRef = useAtomValue(playerRefAtom);
  const [blocked, setBlocked] = useAtom(tldexBlockedAtom);
  if (blocked.includes(name)) return null;
  return (
    <div
      className="flex flex-col p-1 px-2 hover:cursor-pointer hover:bg-base-4"
      onClick={() => playerRef?.seekTo(video_offset, "seconds")}
    >
      {showHeader && (
        <div
          className={cn("group flex items-center gap-2 text-base-11", {
            "text-primary": is_owner,
            "text-secondary":
              !is_owner && (is_verified || is_moderator || is_vtuber),
          })}
        >
          {is_vtuber && channel_id && (
            <img
              className="h-8 w-8 rounded-full"
              src={getChannelPhoto(channel_id, 28)}
            />
          )}
          <div className="flex flex-col">
            <div className="flex gap-1">
              {is_vtuber && (
                <Badge
                  size="sm"
                  variant="outline"
                  className="border-base px-1 py-0.5 text-[0.6rem] text-base-11"
                >
                  VTuber
                </Badge>
              )}
              {is_moderator && (
                <Badge
                  size="sm"
                  variant="outline"
                  className="border-base px-1 py-0.5 text-[0.6rem] text-base-11"
                >
                  Mod
                </Badge>
              )}
            </div>
            <span className="line-clamp-1 whitespace-nowrap text-sm">
              {name}
              {is_verified && <span className="ml-2">✓</span>}
            </span>
          </div>
        </div>
      )}
      <div className="break-words">
        <span className="mr-2 whitespace-nowrap text-xs text-base-11">
          {formatDuration(video_offset * 1000)}
        </span>
        {parsed ? (
          <span
            // eslint-disable-next-line tailwindcss/no-custom-classname
            className="tlmsg"
            dangerouslySetInnerHTML={{ __html: parsed }}
          />
        ) : (
          message
        )}
      </div>
    </div>
  );
}

/**!SECTION
 * 
 * 
 *         <PopoverContent>
          <div className="flex flex-col items-center gap-2">
            <span className="font-bold text-base-12">{name}</span>
            {channel_id && (
              <Button className="w-full bg-red hover:bg-red-8" asChild>
                <Link
                  to={`https://www.youtube.com/channel/${channel_id}`}
                  target="_blank"
                >
                  <div className="i-mdi:youtube" />
                  YouTube
                </Link>
              </Button>
            )}
            {channel_id && is_vtuber && (
              <Button className="w-full" asChild>
                <Link to={`/channel/${channel_id}`}>
                  <div className="" />
                  Holodex
                </Link>
              </Button>
            )}
            <Button
              className="w-full bg-orange hover:bg-orange-8"
              onClick={() =>
                setBlocked((prev) =>
                  isBlocked
                    ? prev.filter((channel) => name !== channel)
                    : [...prev, name],
                )
              }
            >
              {isBlocked ? "Unblock" : "Block"}
            </Button>
          </div>
        </PopoverContent>
 */
