import { LLMChain } from "langchain/chains";
import { PromptTemplate } from 'langchain/prompts';
import { BaseLanguageModel } from 'langchain/base_language';
import { Document } from 'langchain/document';

// class for generative agent
export class GenerativeAgent {
    name: string;
    llm: BaseLanguageModel;

    // memory
    memory: any = [];

    // constructor
    constructor(kwargs: {
        name: string,
        llm: BaseLanguageModel,
    }) {
        this.name = kwargs.name;
        this.llm = kwargs.llm;
    }

    addMemory(memory_content: string) {
        const document = new Document({ pageContent: memory_content, metadata: {} });
        this.memory.push(document);
    }

    // TODO: return recent observations without going over the token limit
    getRecentObservations() {
        let recent_observations = "";

        // loop backwards so recent memories in front
        for (let i = this.memory.length - 1; i >= 0; i--) {
            recent_observations += this.memory[i].pageContent + "; ";
        }

        return recent_observations;
    }

    /**
     * React to a given observation.
     */
    async _generateReaction(observation: string, suffix: string): Promise<string> {
        const prompt = PromptTemplate.fromTemplate(
            "It is {current_time}."
            + "\nMost recent observations: {recent_observations}"
            + "\nObservation: {observation}"
            + "\n\n" + suffix
        );
        const current_time_str = new Date().toLocaleString("en-US", { month: "long", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
        const kwargs = {
            current_time: current_time_str,
            agent_name: this.name,
            observation: observation,
            recent_observations: "",
        };
        kwargs["recent_observations"] = this.getRecentObservations();
        const action_prediction_chain = new LLMChain({ llm: this.llm, prompt: prompt });

        console.log('_generateReaction kwargs:');
        console.log(kwargs);

        const result = await action_prediction_chain.call(kwargs);

        console.log('_generateReaction call result:');
        console.log(result);

        return result.text.trim();
    }

    async generateReaction(observation: string): Promise<[boolean, string]> {
        const call_to_action_template = (
            "Should {agent_name} react to the observation, and if so,"
            + " what would be an appropriate reaction? Respond in one line."
            + ' If the action is to engage in dialogue, write:\nSAY: "what to say"'
            + "\notherwise, write:\nREACT: {agent_name}'s reaction (if anything)."
            + "\nEither do nothing, react, or say something but not both.\n\n"
        );
        const full_result = await this._generateReaction(observation, call_to_action_template);
        const result = full_result.trim().split('\n')[0];
        this.addMemory(`${this.name} observed ${observation} and reacted by ${result}`);
        if (result.includes("REACT:")) {
            // @ts-ignore
            const reaction = result.split("REACT:").pop().trim();
            return [false, `${this.name}: ${reaction}`];
        }
        if (result.includes("SAY:")) {
            // @ts-ignore
            const said_value = result.split("SAY:").pop().trim();
            return [true, `${this.name} said ${said_value}`];
        } else {
            return [false, result];
        }
    }

    async generateDialogueResponse(observation: string): Promise<[boolean, string]> {
        const call_to_action_template = (
            'What would {agent_name} say? To end the conversation, write: GOODBYE: "what to say". Otherwise to continue the conversation, write: SAY: "what to say next"\n\n'
        );
        const full_result = await this._generateReaction(observation, call_to_action_template);
        const result = full_result.trim().split('\n')[0];
        if (result.includes("GOODBYE:")) {
            // @ts-ignore
            const farewell = result.split("GOODBYE:").pop().trim();
            this.addMemory(`${this.name} observed ${observation} and said ${farewell}`);
            return [false, `${this.name} said ${farewell}`];
        }
        if (result.includes("SAY:")) {
            // @ts-ignore
            const response_text = result.split("SAY:").pop().trim();
            this.addMemory(`${this.name} observed ${observation} and said ${response_text}`);
            return [true, `${this.name} said ${response_text}`];
        } else {
            return [false, result];
        }
    }
}