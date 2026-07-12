import ContactForm from "./ContactForm";
import TrackedLink from "./TrackedLink";

const Arrow = () => <span aria-hidden="true">→</span>;
const BrandSign = () => <><b>WELL</b><i>—</i><b>CLIMATE</b></>;

const solutions = [
  { title: "VRF / VRV", text: "Зональный климат-контроль для офисов, бизнес-центров, гостиниц и других коммерческих объектов.", image: "/ref-vrf-restored.webp", alt: "Наружные блоки VRF-системы", action: "Получить расчёт →", width: 1000, height: 723 },
  { title: "Чиллеры и фанкойлы", text: "Централизованное охлаждение зданий с подбором оборудования под расчётные нагрузки.", image: "/ref-chiller-restored.webp", alt: "Промышленный чиллер", action: "Получить расчёт →", width: 1000, height: 667 },
  { title: "Вентиляция", text: "Приточно-вытяжные системы для стабильного воздухообмена и требуемых параметров воздуха.", image: "/ref-ventilation-restored.webp", alt: "Приточно-вытяжная вентиляционная установка", action: "Получить расчёт →", width: 1000, height: 407 },
  { title: "Поставка оборудования", text: "Подбор и поставка климатического оборудования по готовому проекту или нашему расчёту.", image: "/solution-precision-transparent.webp", alt: "Климатическое оборудование для коммерческого объекта", action: "Отправить проект →", width: 1000, height: 625 },
  { title: "Монтаж и сервис", text: "Монтаж, пусконаладка, регулярное обслуживание и оперативный ремонт инженерных систем.", image: "/solution-service-transparent.webp", alt: "Сервисное обслуживание климатического оборудования", action: "Обсудить задачу →", width: 1000, height: 640 },
];

const typicalSolutions = [
  { title: "Группа наружных VRF-блоков", category: "Размещение оборудования на кровельной раме с организованной прокладкой фреоновых трасс.", image: "/typical-solutions/commercial-vrf-rooftop.webp", alt: "Группа наружных VRF-блоков MDV на кровле коммерческого здания" },
  { title: "VRF-система у фасада здания", category: "Линейное размещение наружных блоков на общей металлической опоре с удобным доступом для сервиса.", image: "/typical-solutions/commercial-vrf-facade.webp", alt: "Наружные VRF-блоки MDV на металлической раме у фасада" },
  { title: "Кассетное кондиционирование ресторана", category: "Кассетный блок встроен в открытый потолок вместе с системой вентиляционных воздуховодов.", image: "/typical-solutions/restaurant-cassette-warm.webp", alt: "Кассетный кондиционер и воздуховоды под открытым потолком ресторана" },
  { title: "Кассетные блоки в ресторанном зале", category: "Равномерное распределение охлаждённого воздуха без напольного оборудования и настенных блоков.", image: "/typical-solutions/restaurant-cassette-green.webp", alt: "Кассетные кондиционеры в интерьере ресторанного зала" },
  { title: "Кондиционирование серверной", category: "Кассетные блоки обеспечивают подачу воздуха в помещение с высокой постоянной тепловой нагрузкой.", image: "/typical-solutions/public-cassette-server-room.webp", alt: "Кассетные кондиционеры над серверными стойками технического помещения" },
  { title: "Настенный блок в торговом помещении", category: "Компактное решение для локального охлаждения магазина, офиса или небольшого коммерческого помещения.", image: "/typical-solutions/retail-wall-unit.webp", alt: "Настенный кондиционер в интерьере магазина одежды" },
  { title: "Вентиляция и кассетное кондиционирование", category: "Совместное размещение воздуховодов, кассетных блоков и инженерных коммуникаций под открытым потолком.", image: "/typical-solutions/ventilation-and-cassette.webp", alt: "Вентиляционные воздуховоды и кассетный блок под потолком помещения" },
  { title: "Система на канальных фанкойлах", category: "Фанкойлы, воздуховоды и трубопроводы размещены в запотолочном пространстве коммерческого помещения.", image: "/typical-solutions/fan-coil-installation.webp", alt: "Канальные фанкойлы и инженерные коммуникации под потолком коммерческого помещения" },
];

const stages = [
  ["01", "Получаем проект или проводим аудит", "Изучаем объект, исходные данные и требования к системе."],
  ["02", "Рассчитываем решение и готовим смету", "Подбираем оборудование и фиксируем состав работ."],
  ["03", "Поставляем оборудование", "Комплектуем объект и организуем поставку."],
  ["04", "Выполняем монтаж", "Собственные бригады монтируют систему по проекту."],
  ["05", "Проводим пусконаладку и сервис", "Настраиваем систему и продолжаем обслуживание после запуска."],
];

const trust = [
  ["11 лет", "работаем с климатическими системами"], ["150+ объектов", "разного масштаба и назначения"],
  ["Собственные бригады", "монтаж и пусконаладка"], ["Полный цикл", "от расчёта до запуска"],
  ["Сервис", "обслуживание после монтажа"], ["Москва и МО", "основная зона работы"],
];

const brands = [
  { name: "Daikin", logo: "/logos-daikin.svg" }, { name: "Mitsubishi Electric", logo: "/logos-mitsubishi.svg" },
  { name: "MDV", logo: null }, { name: "Haier", logo: "/logos-haier.svg" }, { name: "DANTEX", logo: null }, { name: "Royal Clima", logo: null },
];

const faq = [
  ["Можно ли заказать только оборудование?", "Да. Подберём и поставим оборудование по готовому проекту или исходным данным."],
  ["Можно ли сделать расчёт по готовому проекту?", "Да. Передайте проект и спецификацию через форму — инженер изучит материалы и уточнит задачу."],
  ["Какие бренды вы поставляете?", "Работаем с оборудованием ведущих климатических брендов, включая Daikin, Mitsubishi Electric, MDV, Haier, Dantex и Royal Clima."],
  ["Выполняете ли вы монтаж?", "Да. Выполняем монтаж и пусконаладку климатических систем собственными бригадами."],
  ["Работаете ли вы с коммерческими объектами и частными домами?", "Основное направление — коммерческие объекты. Также работаем с загородными домами."],
  ["Можно ли подобрать аналог заложенного в проект оборудования?", "Да. Инженер проверит параметры проекта и предложит подходящий вариант оборудования."],
  ["В каких регионах вы работаете?", "Работаем в Москве и Московской области."],
  ["Как передать проект на расчёт?", "Прикрепите PDF, DWG, DXF, ZIP или изображения к форме внизу страницы."],
];

function TelegramLink({ href, className, children, label }: { href?: string; className?: string; children: React.ReactNode; label?: string }) {
  if (!href) return null;
  return <TrackedLink href={href} target="_blank" rel="noopener noreferrer" goal="telegram_click" className={className} aria-label={label}>{children}</TrackedLink>;
}

export default function Home() {
  const telegramUrl = process.env.TELEGRAM_PUBLIC_URL?.trim();
  const structuredData = { "@context": "https://schema.org", "@type": "LocalBusiness", name: "Well-Climate", url: "https://well-climate.ru", telephone: "+79030183025", email: "sale@well-climate.ru", areaServed: ["Москва", "Московская область"], description: "Проектирование, поставка, монтаж и сервис коммерческих климатических систем." };

  return <main id="main-content">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <a className="skipLink" href="#main-content">Перейти к содержанию</a>
    <header className="siteHeader shell">
      <a href="#top" className="brand" aria-label="Well-Climate"><BrandSign /></a>
      <nav aria-label="Главное меню"><a href="#solutions">Решения</a><a href="#process">Как работаем</a><a href="#objects">Типовые решения</a><a href="#trust">О компании</a><a href="#faq">FAQ</a><a href="#contact">Контакты</a></nav>
      <div className="headerContact"><TrackedLink href="tel:+79030183025" goal="phone_click">+7 (903) 018-30-25</TrackedLink><TelegramLink href={telegramUrl}>Telegram</TelegramLink><a className="headerMeta" href="mailto:sale@well-climate.ru">sale@well-climate.ru</a></div>
      <TrackedLink href="#contact" goal="form_navigate" className="consult">Отправить проект <Arrow /></TrackedLink>
      <details className="mobileMenu"><summary aria-label="Открыть меню">Меню</summary><nav><a href="#solutions">Решения</a><a href="#process">Как работаем</a><a href="#objects">Типовые решения</a><a href="#faq">FAQ</a><a href="#contact">Контакты</a></nav></details>
      <div className="mobileQuick"><TrackedLink href="tel:+79030183025" goal="phone_click">Позвонить</TrackedLink><TelegramLink href={telegramUrl}>Telegram</TelegramLink></div>
    </header>

    <section className="hero shell" id="top">
      <div className="heroCopy"><p className="kicker">Коммерческие климатические системы</p><h1>Климатические системы для коммерческих объектов под ключ</h1><p className="lead">Проектируем, поставляем и монтируем VRF/VRV, чиллеры, фанкойлы и вентиляцию в Москве и Московской области.</p><div className="actions"><TrackedLink href="#contact" goal="form_navigate" className="btn green">Отправить проект на расчёт <Arrow /></TrackedLink><TelegramLink href={telegramUrl} className="btn outline">Написать инженеру в Telegram <Arrow /></TelegramLink></div><p className="heroNote">Проверим проект, спецификацию и предложим оборудование или подходящий аналог.</p><div className="heroStats"><div><b>11</b><span>лет на рынке</span></div><div><b>150+</b><span>объектов</span></div><div><b className="pin">⌾</b><span>Москва / МО</span></div></div></div>
      <div className="building"><img src="/hero-building-no-labels-transparent.webp" alt="Инженерная схема климатических систем коммерческого здания" width="1080" height="1157" fetchPriority="high" decoding="async" /><div className="heroLabels" aria-hidden="true"><span>Приточная<br />установка</span><span>Воздуховоды<br />подачи</span><span>Диффузоры</span><span>Фанкойлы</span><span>Возврат<br />воздуха</span><span>Инженерное<br />помещение</span></div></div>
    </section>

    <section className="solutions" id="solutions"><div className="shell"><div className="sectionTitle"><p className="kicker">Решения</p><h2>Коммерческий климат<br />как единая инженерная система</h2></div><div className="solutionGrid">{solutions.map((item, index) => <article key={item.title} className={`solution s${index + 1}`}><div><h3>{item.title}</h3><p>{item.text}</p><TrackedLink href="#contact" goal="service_select" service={item.title} aria-label={`${item.action.replace(" →", "")}: ${item.title}`}>{item.action}</TrackedLink></div><div className="equipment"><img src={item.image} alt={item.alt} width={item.width} height={item.height} loading="lazy" decoding="async" /></div></article>)}</div></div></section>

    <section className="process shell" id="process"><div className="sectionTitle"><p className="kicker">Как работаем</p><h2>От проекта до стабильной работы системы</h2></div><ol>{stages.map(([number, title, text]) => <li key={number}><b>{number}</b><h3>{title}</h3><p>{text}</p></li>)}</ol></section>

    <section className="trust" id="trust"><div className="shell"><div className="trustShowcase"><figure className="trustPortrait"><img src="/team/engineer-well-climate.webp" alt="Инженер Well-Climate на объекте с климатическим оборудованием" width="1086" height="1448" loading="lazy" decoding="async" /><figcaption><span>Евгений Кобзев</span><b>Инженер</b></figcaption></figure><div className="trustCopy"><p className="kicker inverse">Почему нам доверяют</p><h2>Инженерная команда полного цикла</h2><p className="trustStatement">Берём на себя расчёт, поставку, монтаж, пусконаладку и дальнейший сервис климатической системы.</p><div className="trustScope"><span>Один ответственный исполнитель</span><b>от расчёта до запуска</b></div><div className="trustFacts">{trust.map(([value, label]) => <article key={value}><b>{value}</b><span>{label}</span></article>)}</div></div></div></div></section>

    <section className="objects shell typicalSolutions" id="objects" aria-labelledby="typical-solutions-title"><div className="sectionTitle"><p className="kicker">Примеры решений</p><h2 id="typical-solutions-title">Типовые решения для разных объектов</h2></div><div className="caseGrid typicalGrid">{typicalSolutions.map((item) => <article key={item.image}><img src={item.image} alt={item.alt} width="1536" height="1024" loading="lazy" decoding="async" /><div className="caseBody"><h3>{item.title}</h3><p>{item.category}</p></div></article>)}</div></section>

    <section className="brands" aria-labelledby="brands-title"><div className="shell"><div className="sectionTitle"><p className="kicker">Оборудование</p><h2 id="brands-title">Оборудование ведущих климатических брендов</h2><p className="projectNote">Подбираем оборудование под параметры проекта, бюджет и требования к эксплуатации.</p></div><div className="brandRow">{brands.map((brand) => <div className="brandLogo" key={brand.name}>{brand.logo ? <img src={brand.logo} alt={brand.name} width="135" height="36" loading="lazy" decoding="async" /> : <b>{brand.name}</b>}</div>)}</div></div></section>

    <section className="faq shell" id="faq"><div className="sectionTitle"><p className="kicker">FAQ</p><h2>Коротко о расчёте, поставке и монтаже</h2></div><div className="faqGrid">{faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

    <section className="contact" id="contact"><div className="shell contactGrid"><div><p className="kicker inverse">Отправить проект</p><h2>Получите предварительный расчёт</h2><p>Прикрепите проект, спецификацию или фотографии объекта. Инженер изучит материалы и свяжется с вами для уточнения задачи.</p><TrackedLink href="tel:+79030183025" goal="phone_click">+7 (903) 018-30-25</TrackedLink><a href="mailto:sale@well-climate.ru">sale@well-climate.ru</a><TelegramLink href={telegramUrl}>Написать инженеру в Telegram</TelegramLink></div><ContactForm /></div></section>

    <footer className="footer shell"><a href="#top" className="brand"><BrandSign /></a><p>Коммерческие климатические системы</p><nav><a href="#solutions">Решения</a><a href="#process">Как работаем</a><a href="#objects">Типовые решения</a><a href="#faq">FAQ</a><a href="/privacy">Политика</a></nav><div className="footerContacts"><span>Москва и Московская область</span><TrackedLink href="tel:+79030183025" goal="phone_click">+7 (903) 018-30-25</TrackedLink><TelegramLink href={telegramUrl}>Telegram</TelegramLink><a href="mailto:sale@well-climate.ru">sale@well-climate.ru</a></div><small>© 2026</small></footer>
    <TelegramLink href={telegramUrl} className="floatingTelegram" label="Написать инженеру в Telegram"><img src="/telegram.svg" alt="" width="24" height="24" aria-hidden="true" /></TelegramLink>
    <TrackedLink href="#contact" goal="form_navigate" className="mobileProjectCta">Отправить проект</TrackedLink>
  </main>;
}
