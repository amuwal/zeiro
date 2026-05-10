import { createStep, createWorkflow } from '@mastra/core/workflows';
import { triageResultSchema } from '@zeiro/core';
import { z } from 'zod';
import { draftReply } from '../../lib/draft-reply';
import { triageAgent } from '../agents/triage';
import {
  type PipelineInput,
  pipelineInputSchema,
  pipelineOutputSchema,
} from '../schemas';

const triageOutputSchema = z.object({
  input: pipelineInputSchema,
  triage: triageResultSchema,
});

const triageStep = createStep({
  id: 'triage',
  inputSchema: pipelineInputSchema,
  outputSchema: triageOutputSchema,
  execute: async ({ inputData }: { inputData: PipelineInput }) => {
    const { object } = await triageAgent.generate(inputData.body, {
      output: triageResultSchema,
    });
    return { input: inputData, triage: object };
  },
});

const draftStep = createStep({
  id: 'draft',
  inputSchema: triageOutputSchema,
  outputSchema: pipelineOutputSchema,
  execute: async ({ inputData }) => {
    return draftReply(inputData.input, inputData.triage);
  },
});

export const inquiryPipeline = createWorkflow({
  id: 'inquiry-pipeline',
  inputSchema: pipelineInputSchema,
  outputSchema: pipelineOutputSchema,
})
  .then(triageStep)
  .then(draftStep)
  .commit();
