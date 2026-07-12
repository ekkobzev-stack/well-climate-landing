import TrackedLink from "../TrackedLink";
import type { RealCase } from "../data/cases";

export default function RealCases({ cases }: { cases: RealCase[] }) {
  if (!cases.length) return null;

  return (
    <section className="realCases" id="real-cases" aria-labelledby="real-cases-title">
      <div className="shell">
        <header className="sectionTitle realCasesHead">
          <div>
            <p className="kicker">Реальные объекты</p>
            <h2 id="real-cases-title">Кейсы из практики Well-Climate</h2>
          </div>
          <p>Фотографии с объектов показывают размещение оборудования, узлы монтажа и готовые инженерные трассы.</p>
        </header>

        <div className="realCaseList">
          {cases.map((item, index) => (
            <article className="realCase" key={`${item.title}-${item.city ?? index}`}>
              <div className="realCaseVisual">
                <figure className="realCaseCover">
                  <img
                    src={item.photos[0].src}
                    alt={item.photos[0].alt}
                    width={item.photos[0].width}
                    height={item.photos[0].height}
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption>{item.photos[0].caption}</figcaption>
                </figure>
                <div className="realCaseGallery">
                  {item.photos.slice(1).map((photo) => (
                    <figure key={photo.src}>
                      <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" />
                      <figcaption>{photo.caption}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>

              <div className="realCaseContent">
                <span className="realCaseNumber" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <p className="realCaseMeta">{[item.objectType, item.city].filter(Boolean).join(" · ")}</p>
                <h3>{item.title}</h3>
                <p className="realCaseSummary">{item.summary}</p>

                <dl className="realCaseFacts">
                  {item.systemType && <div><dt>Система</dt><dd>{item.systemType}</dd></div>}
                  {item.equipment && <div><dt>Оборудование</dt><dd>{item.equipment}</dd></div>}
                  {item.area && <div><dt>Площадь</dt><dd>{item.area}</dd></div>}
                  {item.capacity && <div><dt>Мощность</dt><dd>{item.capacity}</dd></div>}
                  {item.duration && <div><dt>Срок</dt><dd>{item.duration}</dd></div>}
                </dl>

                <div className="realCaseWorks">
                  <h4>Выполненные работы</h4>
                  <ul>{item.works.map((work) => <li key={work}>{work}</li>)}</ul>
                </div>

                {item.result && <p className="realCaseResult"><span>Результат</span>{item.result}</p>}
                <TrackedLink href="#contact" goal="service_select" service={`Похожий объект: ${item.title}`}>
                  Обсудить похожий объект <span aria-hidden="true">→</span>
                </TrackedLink>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
