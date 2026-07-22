import PosterCard from './PosterCard';
import { SkeletonRow } from './Skeletons';

export default function Row({ title, items }) {
  if (items === null || items === undefined) return <SkeletonRow />;
  if (!items.length) return null;

  return (
    <section className="row fade-up">
      <h2 className="row-title">{title}</h2>
      <div className="row-scroller">
        {items.map((e) => (
          <PosterCard key={e.id} entity={e} />
        ))}
      </div>
    </section>
  );
}
