import { getFirm, listFirmDocuments, listGlobalSourcesForFirm, listIngestionJobs } from '@zeiro/db';
import { FirmDocsGrid } from '@/components/knowledge/firm-docs-grid';
import { GlobalPackCard } from '@/components/knowledge/global-pack-card';
import { JobsBanner } from '@/components/knowledge/jobs-banner';
import { LibraryHeader } from '@/components/knowledge/library-header';
import { requireFirmContext } from '@/lib/firm-context';

type SearchParams = { ingested?: string; job?: string };

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { firmId } = await requireFirmContext();
  const [firm, documents, globals, jobs, params] = await Promise.all([
    getFirm(firmId),
    listFirmDocuments(firmId),
    listGlobalSourcesForFirm(firmId),
    listIngestionJobs(firmId, 10),
    searchParams,
  ]);

  const globalEnabled = globals.filter((g) => !g.disabled).length;

  return (
    <div className="kb-library">
      <LibraryHeader
        firmName={firm.name}
        totalFirm={documents.length}
        globalEnabled={globalEnabled}
        globalTotal={globals.length}
      />

      {params.ingested && (
        <div className="kb-flash" role="status">
          <span className="kb-flash-mark" aria-hidden>
            ✓
          </span>
          {params.ingested}件のチャンクをナレッジに追加しました
        </div>
      )}

      <JobsBanner initialJobs={jobs} {...(params.job ? { highlightJobId: params.job } : {})} />

      <GlobalPackCard listings={globals} />
      <FirmDocsGrid documents={documents} />
    </div>
  );
}
