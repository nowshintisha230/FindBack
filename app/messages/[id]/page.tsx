import ChatRoom from "@/components/ChatRoom";

const ChatPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return <ChatRoom id={id} />;
};

export default ChatPage;