import { FlowContainer } from "@/components/layout/FlowContainer";

export default function ClarificationPage({ params }: { params: { flowId: string } }) {
  return (
    <FlowContainer>
      <h1 className="text-xl text-gray-400 mb-8 tracking-widest uppercase text-center">Refining Flow</h1>
      <p className="text-center">STUB: AI clarification questions for Flow {params.flowId}.</p>
    </FlowContainer>
  );
}
