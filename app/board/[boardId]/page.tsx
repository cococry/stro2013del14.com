

import Board from "@/components/Board";

  export default async function BoardPage({
  params,
}: {
  params: { boardId: string };
}) {
  return <div>{params.boardId}</div>;
  const { boardId } = await params; 

  return <Board boardId={boardId} />;
}
