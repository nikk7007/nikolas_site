<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class EmailTest extends TestCase
{
    private string $tmp = '';

    protected function tearDown(): void
    {
        if ($this->tmp !== '' && is_file($this->tmp)) {
            unlink($this->tmp);
        }
    }

    private function envFile(string $contents): string
    {
        $this->tmp = tempnam(sys_get_temp_dir(), 'env');
        file_put_contents($this->tmp, $contents);
        return $this->tmp;
    }

    // --- load_env ---

    public function testLoadEnvParsesKeyValueQuotesAndComments(): void
    {
        $env = load_env($this->envFile("# comentário\nA=1\nB=\"dois\"\nC='três'\n"));
        $this->assertSame(['A' => '1', 'B' => 'dois', 'C' => 'três'], $env);
    }

    public function testLoadEnvToleratesBom(): void
    {
        $env = load_env($this->envFile("\xEF\xBB\xBFA=1\n"));
        $this->assertSame('1', $env['A'] ?? null);
    }

    public function testLoadEnvSkipsLinesWithoutEqualsAndEmptyKeys(): void
    {
        $env = load_env($this->envFile("semigual\n=semchave\nD=ok\n"));
        $this->assertSame(['D' => 'ok'], $env);
    }

    public function testLoadEnvMissingFileReturnsEmpty(): void
    {
        $this->assertSame([], load_env(sys_get_temp_dir() . '/nao_existe_' . uniqid()));
    }

    // --- parse_bearer ---

    public function testParseBearerExtractsToken(): void
    {
        $this->assertSame('abc123', parse_bearer('Bearer abc123'));
    }

    public function testParseBearerIsCaseInsensitive(): void
    {
        $this->assertSame('xyz', parse_bearer('bEaReR   xyz'));
    }

    public function testParseBearerEmptyOrMissing(): void
    {
        $this->assertSame('', parse_bearer(''));
        $this->assertSame('', parse_bearer('Basic Zm9v'));
    }

    // --- normalize_input ---

    public function testNormalizeInputPicksBlocksOverMarkdown(): void
    {
        $in = normalize_input(['blocks' => [['type' => 'p', 'text' => 'x']], 'markdown' => '# ignorado']);
        $this->assertSame('blocks', $in['mode']);
        $this->assertFalse($in['empty']);
    }

    public function testNormalizeInputFallsBackToMarkdown(): void
    {
        $in = normalize_input(['markdown' => '# oi']);
        $this->assertSame('markdown', $in['mode']);
        $this->assertSame('# oi', $in['markdown']);
        $this->assertFalse($in['empty']);
    }

    public function testNormalizeInputEmptyContent(): void
    {
        $this->assertTrue(normalize_input([])['empty']);
        $this->assertTrue(normalize_input(['markdown' => '   '])['empty']);
        $this->assertTrue(normalize_input(['blocks' => []])['empty']);
    }

    public function testNormalizeInputSanitizesSubject(): void
    {
        $in = normalize_input(['subject' => "Linha1\r\nLinha2", 'markdown' => 'x']);
        $this->assertSame('Linha1Linha2', $in['subject']);
    }

    public function testNormalizeInputSubjectMax200(): void
    {
        $in = normalize_input(['subject' => str_repeat('a', 300), 'markdown' => 'x']);
        $this->assertSame(200, mb_strlen($in['subject']));
    }

    public function testNormalizeInputPreheaderDefaultsToSubject(): void
    {
        $in = normalize_input(['subject' => 'Assunto', 'markdown' => 'x']);
        $this->assertSame('Assunto', $in['preheader']);
    }
}
