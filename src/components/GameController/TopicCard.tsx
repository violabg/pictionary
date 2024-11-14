import { Topic } from "@/types";

interface TopicCardProps {
  topic: Topic;
}

export function TopicCard({ topic }: TopicCardProps) {
  return (
    <div className="bg-secondary p-4 rounded-lg">
      <p className="mb-4 font-bold text-primary text-xl">{topic.title}</p>
      <p className="text-sm text-white">{topic.description}</p>
    </div>
  );
}
