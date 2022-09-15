<script>
    import FraudBlackList 	 from "./fraud/FraudBlackList.svelte"
</script>
<h3 class='head-text'>프로드 방지</h3>
<ul class="nav">
    <li class="nav-item">
        <!-- svelte-ignore a11y-invalid-attribute -->
        <a class="nav-link active" href="#">블랙 리스트</a>
    </li>
</ul>


<div class='cont'>
    <FraudBlackList/>
</div>