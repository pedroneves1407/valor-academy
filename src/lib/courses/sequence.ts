export type SequenceLesson = {
  id: string;
  is_mandatory: boolean;
  completed: boolean;
};

export type SequenceModule = {
  id: string;
  lessons: SequenceLesson[];
};

/**
 * Calcula, para cada aula, se ela está disponível: uma aula só é liberada quando
 * todas as aulas obrigatórias anteriores (no módulo atual e em módulos anteriores)
 * já foram concluídas. Aulas não obrigatórias nunca bloqueiam a sequência, mas
 * também respeitam o bloqueio das aulas obrigatórias anteriores a elas.
 *
 * Usado tanto para renderizar o estado da trilha no player quanto para validar
 * no servidor se uma aula pode ser acessada/concluída — nunca confiar apenas no
 * estado calculado no cliente.
 */
export function computeLessonAvailability(modules: SequenceModule[]): Map<string, boolean> {
  const availability = new Map<string, boolean>();
  let previousMandatoryCompleted = true;

  for (const mod of modules) {
    for (const lesson of mod.lessons) {
      availability.set(lesson.id, previousMandatoryCompleted);
      if (lesson.is_mandatory && !lesson.completed) {
        previousMandatoryCompleted = false;
      }
    }
  }

  return availability;
}

export function findFirstAvailableIncompleteLesson(modules: SequenceModule[]): string | null {
  const availability = computeLessonAvailability(modules);
  for (const mod of modules) {
    for (const lesson of mod.lessons) {
      if (availability.get(lesson.id) && !lesson.completed) return lesson.id;
    }
  }
  // todas concluídas: retorna a última aula
  const allLessons = modules.flatMap((m) => m.lessons);
  return allLessons.length > 0 ? allLessons[allLessons.length - 1].id : null;
}
