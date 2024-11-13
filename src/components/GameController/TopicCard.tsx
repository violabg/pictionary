import { Topic } from "@/types";

interface TopicCardProps {
  topic: Topic;
}

export function TopicCard({ topic }: TopicCardProps) {
  return (
    <div className="bg-primary p-2 rounded-lg">
      <p className="mb-4 font-bold text-primary-foreground text-xl">
        {topic.title}
      </p>
      <p className="text-black text-sm">{topic.description}</p>
    </div>
  );
}
