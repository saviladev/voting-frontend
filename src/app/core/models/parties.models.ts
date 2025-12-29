export interface PartyDto {
  id: string;
  name: string;
  acronym?: string | null;
  scope: 'NATIONAL' | 'ASSOCIATION' | 'BRANCH' | 'CHAPTER';
  associationId?: string | null;
  branchId?: string | null;
  chapterId?: string | null;
  association?: { id: string; name: string } | null;
  branch?: { id: string; name: string; association?: { id: string; name: string } } | null;
  chapter?: { id: string; name: string; branch?: { id: string; name: string; association?: { id: string; name: string } } } | null;
  isActive: boolean;
}

export interface CreatePartyDto {
  name: string;
  acronym?: string;
  scope: 'NATIONAL' | 'ASSOCIATION' | 'BRANCH' | 'CHAPTER';
  associationId?: string;
  branchId?: string;
  chapterId?: string;
  isActive?: boolean;
}
