import { ChatOpenAI } from 'langchain/chat_models/openai';
import { HumanMessage, SystemMessage } from 'langchain/schema';
import { ActionDefinition, InputParametersObject } from '@connery-io/sdk';
import { IPluginCache } from ':src/shared/plugin-cache/plugin-cache.interface';
import { IConfig } from ':src/shared/config/config.interface';
import { ActionIdentifiedOutput, ActionNotIdentifiedOutput } from './types';
import { ILlm } from './llm.interface';
import { Inject, Injectable } from '@nestjs/common';

type ExposedAction = {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: {
      [key: string]: {
        type: string;
        description: string;
      };
    };
    required: string[];
  };
};

@Injectable()
export class OpenAiService implements ILlm {
  constructor(@Inject(IPluginCache) private pluginCache: IPluginCache, @Inject(IConfig) private config: IConfig) {}

  async identifyAction(prompt: string): Promise<ActionIdentifiedOutput | ActionNotIdentifiedOutput> {
    // TODO implement

    console.log(JSON.stringify({ type: 'system', message: `Identifying action for prompt: '${prompt}'` }));

    const runnerConfig = this.config.getRunnerConfig();
    if (!runnerConfig.openAiApiKey) {
      throw new Error('The OPENAI_API_KEY is not configured on the runner.');
    }

    const chat = new ChatOpenAI({
      openAIApiKey: runnerConfig.openAiApiKey,
      modelName: 'gpt-3.5-turbo-0613',
    }).bind({
      functions: await this.getExposedActionsJsonSchema(),
    });

    const result = await chat.invoke([
      new SystemMessage(
        `You are a helpful assistant. Your task is to help the user find the requested function and identify its parameters from the user's prompt. Here is a current time in UTC in case you need it for the date or time-related parameters: ${new Date().toUTCString()}`,
      ),
      new HumanMessage(prompt),
    ]);

    const functionCall = result.additional_kwargs?.function_call;
    if (!functionCall) {
      console.error(JSON.stringify({ type: 'error', message: 'Function call is not found in the result.' }));

      return {
        identified: false,
        used: {
          prompt,
        },
      };
    }

    console.log(
      JSON.stringify({ type: 'system', message: `Identified function call: ${JSON.stringify(functionCall)}` }),
    );

    let action;
    try {
      action = await this.pluginCache.getAction(functionCall.name);

      console.log(
        JSON.stringify({
          type: 'system',
          message: `Identified action '${action.definition.key}' found in the plugin ${action.plugin.key}`,
        }),
      );
    } catch (error: any) {
      console.error(JSON.stringify({ type: 'error', message: error.message, stack: error.stack }));

      return {
        identified: false,
        used: {
          prompt,
        },
      };
    }

    const inputParameters: InputParametersObject = JSON.parse(functionCall.arguments);

    return {
      identified: true,
      pluginKey: action.plugin.key,
      actionKey: action.definition.key,
      inputParameters,
      used: {
        prompt,
      },
    };
  }

  private async getExposedActionsJsonSchema(): Promise<ExposedAction[]> {
    const exposedActions = [];

    const actions = await this.pluginCache.getActions();

    for (const action of actions) {
      const actionJsonSchema = this.convertActionToJsonSchema(action.definition);
      exposedActions.push(actionJsonSchema);
    }

    return exposedActions;
  }

  private convertActionToJsonSchema(actionDefinition: ActionDefinition): ExposedAction {
    const exposedAction: ExposedAction = {
      name: actionDefinition.key,
      description: actionDefinition.description || actionDefinition.title,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    };

    for (const inputParameter of actionDefinition.inputParameters) {
      exposedAction.parameters.properties[inputParameter.key] = {
        type: inputParameter.type,
        description: inputParameter.description || inputParameter.title,
      };

      // NOTE: The following code is commented out to let OpenAI classify the user prompt as a function call
      // even if not all the required input parameters are provided by the user.
      // TODO: Find proper solution
      /*
      if (inputParameter.Validation?.Required) {
        exposedAction.parameters.required.push(inputParameter.Key);
      }
      */
    }

    return exposedAction;
  }
}
