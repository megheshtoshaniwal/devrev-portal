import { Zap, Sparkles, Bot, Brain, Star } from "lucide-react";

export const assistantIconMap: Record<string, React.ReactNode> = {
  zap: <Zap className="w-7 h-7 text-accent fill-accent" />,
  sparkles: <Sparkles className="w-7 h-7 text-accent" />,
  bot: <Bot className="w-7 h-7 text-accent" />,
  brain: <Brain className="w-7 h-7 text-accent" />,
  star: <Star className="w-7 h-7 text-accent fill-accent" />,
};

export const assistantIconSmallMap: Record<string, React.ReactNode> = {
  zap: <Zap className="w-4 h-4 text-accent fill-accent" />,
  sparkles: <Sparkles className="w-4 h-4 text-accent" />,
  bot: <Bot className="w-4 h-4 text-accent" />,
  brain: <Brain className="w-4 h-4 text-accent" />,
  star: <Star className="w-4 h-4 text-accent fill-accent" />,
};
