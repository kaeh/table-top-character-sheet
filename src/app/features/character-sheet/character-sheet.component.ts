import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { extractTensDigit } from '@functions/extract-tens-digit';
import { PersistedCharacter, PersistedCharacterPropertyKey } from '@models/persistence/persisted-character.interface';
import { PersistedSkill } from '@models/persistence/persisted-skill.interface';
import { Skill } from '@models/skill.interface';
import { distinctUntilChanged, map, tap } from 'rxjs';
import { CharacterPersisterService } from '../character-persister/character-persister.service';
import { LocalStorageConfigs } from '../character-persister/local-storage-configs';
import { Rules } from '../rules';
import { SkillComponent } from './skill/skill.component';
import { VariableCharacteristicComponent } from './variable-characteristic/variable-characteristic.component';

@Component({
  selector: 'app-character-sheet',
  standalone: true,
  imports: [CommonModule, MatIconModule, VariableCharacteristicComponent, SkillComponent, RouterModule, ReactiveFormsModule],
  templateUrl: './character-sheet.component.html',
  styleUrls: ['./character-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterSheetComponent {
  protected readonly name: FormControl<string>;

  // TODO : Ensure that it does not break anything when the character is changed during component lifecycle
  private readonly characterUniqueKey = toSignal(inject(ActivatedRoute).params.pipe(map(({ uniqKey }) => uniqKey)));
  private readonly characterPersisterService = inject(CharacterPersisterService);

  public readonly skills = {
    strength: new Skill(),
    endurance: new Skill(),
    willpower: new Skill(),
    knowledge: new Skill(),
    combat: new Skill(),
    movement: new Skill(),
    perception: new Skill(),
  }

  public readonly vitality = {
    current: signal(0),
    max: computed(() => Rules.character.computeMaxVitality(this.skills.strength.level(), this.skills.endurance.level(), this.skills.willpower.level()))
  };
  public readonly coldBlood = {
    current: signal(0),
    max: computed(() => Rules.character.computeMaxColdBlood(this.skills.willpower.level(), this.skills.knowledge.level(), this.skills.combat.level()))
  };
  public readonly initiative = computed(() => Rules.character.computeInitiative(extractTensDigit(this.skills.combat.level()), extractTensDigit(this.skills.movement.level()), extractTensDigit(this.skills.perception.level())));

  constructor() {
    const persistedCharacter = this.characterPersisterService.get(this.characterUniqueKey());

    this.name = new FormControl<string>(persistedCharacter.name, { nonNullable: true });

    this.initSkills(persistedCharacter);

    this.vitality.current.set(persistedCharacter.vitality ?? 0);
    this.coldBlood.current.set(persistedCharacter.coldBlood ?? 0);

    this.initPersistence();
  }

  private initSkills(persistedCharacter: PersistedCharacter): void {
    Object.keys(this.skills).forEach((skillKey: string) => {
      const persistedSkill: PersistedSkill = (persistedCharacter as any)[skillKey];

      if (persistedSkill === null || persistedSkill === undefined) {
        return;
      }

      const { base, currentProgression } = persistedSkill;
      const skill = (this.skills as Record<string, Skill>)[skillKey];
      skill.base.set(base);
      skill.progression.current.set(currentProgression);
    });
  }

  private initPersistence(): void {
    this.name.valueChanges
      .pipe(
        distinctUntilChanged(),
        map(LocalStorageConfigs.defaultNameIfEmpty),
        // Ensure stored name is the same as the displayed one
        tap((name) => this.name.setValue(name, { emitEvent: false })),
        tap((name) => this.characterPersisterService.saveProperty(this.characterUniqueKey(), 'name', name)),
        takeUntilDestroyed()
      )
      .subscribe();

    effect(() => this.characterPersisterService.saveProperty(this.characterUniqueKey(), 'vitality', this.vitality.current()));
    effect(() => this.characterPersisterService.saveProperty(this.characterUniqueKey(), 'coldBlood', this.coldBlood.current()));

    // Init skills persistence
    Object.keys(this.skills).forEach((skillKey) => {
      const skill = (this.skills as Record<string, Skill>)[skillKey];
      effect(() => this.characterPersisterService.saveProperty(this.characterUniqueKey(), skillKey as PersistedCharacterPropertyKey, {
        base: skill.base(),
        currentProgression: skill.progression.current()
      }));
    });
  }
}