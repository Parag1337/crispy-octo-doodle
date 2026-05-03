import type { ProjectGroup } from "../types/group.types";

export const EDI_MAJOR_PROJECT_SUBJECT = "Engineering Design Innovation";

export const selectEdiMajorProjectGroup = (groups: ProjectGroup[] | null | undefined): ProjectGroup | null => {
    if (!groups || groups.length === 0) return null;

    const ediGroups = groups.filter(
        (group) => group.isEdiRegistered && group.subject === EDI_MAJOR_PROJECT_SUBJECT
    );

    if (ediGroups.length > 0) {
        return ediGroups.find((group) => Boolean(group.ediGuide)) ?? ediGroups[0];
    }

    return groups.find((group) => group.isEdiRegistered) ?? groups[0] ?? null;
};