export type CanonicalAdventistContentType = "fundamental_belief" | "official_statement" | "church_manual" | "three_angels_message" | "sabbath_school_lesson" | "publishing_resource";
export type CanonicalContentStatus = "draft" | "published" | "archived";
export type ContentAuthority = "general_conference" | "division" | "union" | "conference" | "publishing_house" | "authorized_partner";
export type ContentRights = "public_reference" | "licensed" | "permission_required" | "unknown";
export interface CanonicalSource {
  id: string; title: string; url: string; authority: ContentAuthority; publisher?: string; edition?: string;
  version?: string; publicationDate?: string; language: string; rights: ContentRights;
}
export interface AdventistCanonicalRecord {
  id: string; type: CanonicalAdventistContentType; title: string; summary?: string; status: CanonicalContentStatus;
  source: CanonicalSource; bibleReferences: string[]; tags: string[]; relatedContentIds: string[];
}
export interface AdventistCanonRepository {
  getById(token: string, id: string): Promise<AdventistCanonicalRecord | null>;
  list(token: string, type?: CanonicalAdventistContentType, language?: string): Promise<AdventistCanonicalRecord[]>;
}
export const ADVENTIST_CANONICAL_SOURCES: CanonicalSource[] = [{"id":"gc-secretariat-resources","title":"Seventh-day Adventist Church Secretariat Resources","url":"https://secretariat.adventist.org/resources","authority":"general_conference","language":"en","rights":"public_reference"},{"id":"gc-beliefs","title":"Fundamental Beliefs of Seventh-day Adventists","url":"https://www.adventist.org/beliefs/","authority":"general_conference","language":"en","rights":"public_reference"},{"id":"gc-official-statements","title":"Official Statements and Guidelines","url":"https://gc.adventist.org/beliefs/documents/","authority":"general_conference","language":"en","rights":"public_reference"},{"id":"gc-publications","title":"General Conference Publications","url":"https://gc.adventist.org/publications/","authority":"general_conference","language":"en","rights":"public_reference"},{"id":"gc-publishing","title":"General Conference Publishing Ministries","url":"https://publishing.adventist.org/","authority":"general_conference","language":"en","rights":"permission_required"},{"id":"cpb","title":"Casa Publicadora Brasileira","url":"https://cpb.com.br/","authority":"division","publisher":"Casa Publicadora Brasileira","language":"pt","rights":"permission_required"},{"id":"dsa-publications","title":"Publicações da Igreja Adventista na Divisão Sul-Americana","url":"https://www.adventistas.org/pt/publicacoes/","authority":"division","language":"pt","rights":"public_reference"},{"id":"eud-publishing-houses","title":"Publishing Houses — Inter-European Division","url":"https://eud.adventist.org/about-us/institutions/media/publishing-houses","authority":"division","language":"en","rights":"public_reference"},{"id":"adventist-yearbook","title":"Seventh-day Adventist Yearbook","url":"https://www.adventistyearbook.org/","authority":"general_conference","language":"en","rights":"public_reference"},{"id":"esda","title":"Encyclopedia of Seventh-day Adventists","url":"https://encyclopedia.adventist.org/","authority":"general_conference","language":"en","rights":"public_reference"}];
