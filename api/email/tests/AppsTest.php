<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class AppsTest extends TestCase
{
    private string $tmp = '';

    protected function tearDown(): void
    {
        if ($this->tmp !== '' && is_file($this->tmp)) {
            unlink($this->tmp);
        }
    }

    private function appsFile(string $json): string
    {
        $this->tmp = tempnam(sys_get_temp_dir(), 'apps');
        file_put_contents($this->tmp, $json);
        return $this->tmp;
    }

    // --- read_apps ---

    public function testReadAppsParsesValidEntries(): void
    {
        $apps = read_apps($this->appsFile('{"k1":{"name":"form","from":"F <f@x.com>"},"k2":{"name":"blog"}}'));
        $this->assertSame('form', $apps['k1']['name']);
        $this->assertSame('F <f@x.com>', $apps['k1']['from']);
        $this->assertSame('', $apps['k2']['from']);        // from opcional -> ''
        $this->assertNull($apps['k2']['rpm']);
    }

    public function testReadAppsSkipsEntriesWithoutName(): void
    {
        $apps = read_apps($this->appsFile('{"k1":{"from":"x"},"k2":{"name":"ok"}}'));
        $this->assertArrayNotHasKey('k1', $apps);
        $this->assertArrayHasKey('k2', $apps);
    }

    public function testReadAppsReadsRpmOverride(): void
    {
        $apps = read_apps($this->appsFile('{"k":{"name":"a","rpm":30}}'));
        $this->assertSame(30, $apps['k']['rpm']);
    }

    public function testReadAppsMissingFileOrInvalidJsonReturnsEmpty(): void
    {
        $this->assertSame([], read_apps(sys_get_temp_dir() . '/nao_existe_' . uniqid()));
        $this->assertSame([], read_apps($this->appsFile('isso não é json')));
        $this->assertSame([], read_apps($this->appsFile('[]')));
    }

    // --- match_app ---

    public function testMatchAppFindsByToken(): void
    {
        $apps = ['segredo123' => ['name' => 'form', 'from' => '', 'rpm' => null]];
        $this->assertSame('form', match_app($apps, 'segredo123')['name']);
    }

    public function testMatchAppRejectsWrongOrEmptyToken(): void
    {
        $apps = ['segredo123' => ['name' => 'form', 'from' => '', 'rpm' => null]];
        $this->assertNull(match_app($apps, 'errado'));
        $this->assertNull(match_app($apps, ''));
        $this->assertNull(match_app([], 'qualquer'));
    }

    // --- resolve_from ---

    public function testResolveFromUsesAppFrom(): void
    {
        $this->assertSame('App <a@x.com>', resolve_from(['from' => 'App <a@x.com>'], 'Default <d@x.com>'));
    }

    public function testResolveFromFallsBackToDefault(): void
    {
        $this->assertSame('Default <d@x.com>', resolve_from(['from' => ''], 'Default <d@x.com>'));
        $this->assertSame('Default <d@x.com>', resolve_from(null, 'Default <d@x.com>'));
    }

    // --- resolve_to ---

    public function testResolveToPrefersRequest(): void
    {
        $this->assertSame('req@x.com', resolve_to(['to' => 'req@x.com'], 'fb@x.com'));
    }

    public function testResolveToFallsBackWhenRequestInvalid(): void
    {
        $this->assertSame('fb@x.com', resolve_to(['to' => 'não-email'], 'fb@x.com'));
        $this->assertSame('fb@x.com', resolve_to([], 'fb@x.com'));
    }

    public function testResolveToNullWhenNothingValid(): void
    {
        $this->assertNull(resolve_to(['to' => 'lixo'], ''));
        $this->assertNull(resolve_to([], 'fallback-invalido'));
    }
}
