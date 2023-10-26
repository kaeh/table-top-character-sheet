import { Injectable, computed } from "@angular/core";
import { Skill } from "src/app/interfaces/skill.interface";
import { Rules } from "../rules";

const extractTensDigit = (value: number): number => Math.floor(value / 10);

@Injectable({
    providedIn: 'root'
})
export class CharacterRepository {
    public readonly strength = new Skill();
    public readonly endurance = new Skill();
    public readonly willpower = new Skill();
    public readonly knowledge = new Skill();
    public readonly combat = new Skill();
    public readonly movement = new Skill();
    public readonly perception = new Skill();

    public readonly vitality = {
        current: 0,
        max: computed(() => Rules.character.computeMaxVitality(this.strength.level(), this.endurance.level(), this.willpower.level()))
    };
    public readonly coldBlood = {
        current: 0,
        max: computed(() => Rules.character.computeMaxColdBlood(this.willpower.level(), this.knowledge.level(), this.combat.level()))
    };
    public readonly initiative = computed(() => Rules.character.computeInitiative(extractTensDigit(this.combat.level()), extractTensDigit(this.movement.level()), extractTensDigit(this.perception.level())));
}