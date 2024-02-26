import { Controller, Get, Inject } from '@nestjs/common';
import { Public } from '../auth.guard.js';
import { OpenAiFunctionSchema } from '../../types/llm.js';
import { OpenAPIV3 } from 'openapi-types';
import { OpenAiSpecsService } from '../services/openai-specs.service.js';
import {
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { GenericErrorResponse } from '../dto.js';

@ApiTags('OpenAI')
@ApiExtraModels(GenericErrorResponse)
@ApiInternalServerErrorResponse({
  description: 'Internal server error.',
  schema: {
    $ref: getSchemaPath(GenericErrorResponse),
  },
})
@Controller()
export class OpenAiController {
  constructor(@Inject(OpenAiSpecsService) private openAiSpecsService: OpenAiSpecsService) {}

  // TODO
  @ApiOperation({
    summary: 'Get the "OpenAPI specification" for OpenAI GPTs.',
    description: 'Learn more: [Use Connery actions in OpenAI GPT](https://docs.connery.io/docs/clients/openai/gpt).',
  })
  @ApiOkResponse({
    description: 'The "OpenAPI specification" for OpenAI GPTs.',
    schema: {
      type: 'object',
    },
  })
  @Public()
  @Get('/openai/specs/gpts')
  async getOpenApiSpec(): Promise<OpenAPIV3.Document> {
    return this.openAiSpecsService.getOpenApiSpec();
  }

  // TODO
  @ApiOperation({
    summary: 'Get the "OpenAI Functions specification" for OpenAI Assistant API.',
    description:
      'Learn more: [Use Connery actions with OpenAI Assistants API](https://docs.connery.io/docs/clients/openai/assistant).',
  })
  @ApiOkResponse({
    description: 'The "OpenAI Functions specification" for OpenAI Assistant API.',
    schema: {
      type: 'object',
    },
  })
  @ApiExtraModels(GenericErrorResponse)
  @ApiUnauthorizedResponse({
    description: 'Unauthorized.',
    schema: {
      $ref: getSchemaPath(GenericErrorResponse),
    },
  })
  @ApiSecurity('ApiKey')
  @Get('/openai/specs/assistants-api')
  async getFunctionsSpec(): Promise<OpenAiFunctionSchema[]> {
    return this.openAiSpecsService.getFunctionsSpec(true, null);
  }

  // TODO: implement API endpoints based on shortenned APIs for GPTs (if needed)
}
