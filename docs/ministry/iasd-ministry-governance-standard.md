# ZION OS — IASD Ministry Governance and Content Standard

**Status:** implementation reference and audit contract  
**Review date:** 2026-10-20  
**Scope:** Adventist Youth Ministries, Women's Ministries (MM), Christian Stewardship, and Family Ministries.

## Authority and source hierarchy

1. The current official *Seventh-day Adventist Church Manual* and applicable General Conference actions/policies govern church organization, elected responsibilities, and local church authority.
2. General Conference department manuals and official department guidance govern ministry-specific structure and program philosophy.
3. The South American Division's official materials provide current annual programming and localized resources; use the appropriate Angola/territorial authority where its guidance differs.
4. Local church data (club name, photograph, officers, calendar, attendance, activities, and reports) must be entered or verified by authorized leaders. Never invent a club, member, officer, activity, achievement, or report.
5. Official marks and emblems must not be redesigned. ZION may use premium presentation framing, cropping that preserves the complete emblem, accessible alt text, and an appropriate background; it must not alter the emblem itself or imply endorsement of a local club.

## Official reference sources

- General Conference Church Manual: https://gc.adventist.org/church-manual/
- General Conference brand identity: https://gc.adventist.org/brand-identity/
- General Conference trademark and logo usage: https://www.adventist.org/trademark-and-logo-usage/
- General Conference Youth Ministries manuals/resources: https://www.gcyouthministries.org/resources/resource-manuals/
- General Conference youth ministry portal: https://www.gcyouthministries.org/
- Official Adventist logo/media library and departmental marks: https://downloads.adventistas.org/pt/kits/logotipos/
- Official Adventist Women's Ministries portal: https://www.adventistas.org/pt/mulher/
- Official 2026 Women's Evangelism material: https://downloads.adventistas.org/pt/ministerio-da-mulher/materiais-de-divulgacao/evangelismo-feminino-2026/
- Official Family Ministries portal: https://www.adventistas.org/pt/familia/
- Official Family Resources Book 2026: https://downloads.adventistas.org/pt/ministerio-da-familia/livros/livro-de-recursos-da-familia-2026/
- Official Christian Stewardship portal/resources: https://downloads.adventistas.org/pt/departamento/mordomia-crista/
- Official Christian Stewardship Week 2026: https://downloads.adventistas.org/pt/mordomia-crista/manuais-e-guias/semana-de-mordomia-crista-2026/
- Official monthly Stewardship sermon resources 2026: https://downloads.adventistas.org/pt/mordomia-crista/manuais-e-guias/sermonario-mensal-de-mordomia-crista-2026/

## Ministry philosophy requirements

### Adventist Youth Ministries

- Preserve the central purpose: leading young people into a saving relationship with Jesus Christ and discipleship, supported by spiritual, mental, physical, social, and missionary development.
- Keep program-specific age groups, curriculum, classes, honours, investiture, uniforms, emblems, leadership and safeguarding requirements grounded in the applicable official manual. Do not collapse Adventurers, Pathfinders, Ambassadors, Young Adults, and Public Campus Ministries into one generic programme.
- Formation progress and investitures must come from real, authorized records and the applicable official requirements. Do not award progress from clicks or fabricated catalog entries.
- Protect minors: access to member records, safeguarding/consent data, and activities must be role-restricted and follow church and applicable legal requirements.
- Bible Quiz/RISA links must not imply SSO, shared accounts, or synchronization unless a verified technical integration exists.

### Women's Ministries (MM)

- Build around spiritual growth, discipleship, leadership development, mission, mentoring, compassionate service, and the dignity and safety of women.
- Annual campaigns and materials (for example, 2026 resources) must preserve their official theme, intended use, language, and visual identity. Do not invent an official programme or modify its emblem.

### Christian Stewardship (Mordomia Cristã)

- Treat stewardship as whole-life faithfulness to God: time, spiritual gifts, abilities, body, relationships, environment, and financial resources—not merely fundraising or accounting.
- Support Bible-centred education, discipleship, gratitude, faithful giving, responsible financial management, and authorized reporting.
- Never display a member's giving or financial information to unauthorized leaders or other members; financial records follow strict least-privilege access.

### Family Ministries (Lar e Família)

- Promote Christ-centred family life, premarital preparation, marriage enrichment, parenting, intergenerational care, reconciliation, and pastoral/community support.
- Use the current annual Family Resources Book and official campaigns as the content source. Handle counselling and family-risk information as sensitive data with restricted access; do not expose private case notes in general ministry reports.

## UI imagery standard

- Use official Adventist department/program artwork as the fallback visual where an official asset is available.
- Clearly distinguish an official programme emblem/reference image from a photograph of a specific local club. A local club's real, authorized photo overrides the fallback.
- Keep official emblems unmodified. The premium UI may provide a consistent square frame, contained image fit, subtle border, neutral background, and accessible alt text.
- Store image provenance/source URL and the club's own uploaded image separately where the schema supports it. Do not claim an image depicts a particular local club unless that is verified.

## Production acceptance checklist

- [ ] Confirm the current Church Manual edition and applicable General Conference/territorial guidance before marking any module “compliant”.
- [ ] Each module links to official current manuals/resources and displays the source date/version.
- [ ] Roles and permissions follow church authority; local church leaders cannot grant themselves conference/division/union powers.
- [ ] Real data only; no seeded/fictitious clubs, people, classes, achievements, reports, or financial entries.
- [ ] Audit RLS/API authorization for member, child/minor, counselling, giving, and leadership data.
- [ ] Verify all image URLs, image rights/provenance, responsive display, and fallback behavior.
- [ ] Test the production build and real authorized workflows before declaring completion.

This standard is an engineering/content control reference. It does not itself certify that the implementation is fully compliant; that requires a module-by-module audit and confirmation against the current official manuals and applicable territorial guidance.
