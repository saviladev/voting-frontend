export interface AssociationDto {
  id: string;
  name: string;
}

export interface CreateAssociationDto {
  name: string;
}

export interface BranchDto {
  id: string;
  name: string;
  associationId: string;
  association?: AssociationDto;
}

export interface CreateBranchDto {
  associationId: string;
  name: string;
}

export interface SpecialtyDto {
  id: string;
  name: string;
  associationId: string;
  association?: AssociationDto;
}

export interface CreateSpecialtyDto {
  associationId: string;
  name: string;
}

export interface ChapterDto {
  id: string;
  name: string;
  branchId: string;
  branch?: BranchDto;
  specialties?: ChapterSpecialtyDto[];
}

export interface CreateChapterDto {
  branchId: string;
  specialtyIds?: string[];
  name: string;
}

export interface ChapterSpecialtyDto {
  chapterId: string;
  specialtyId: string;
  specialty?: SpecialtyDto;
}
