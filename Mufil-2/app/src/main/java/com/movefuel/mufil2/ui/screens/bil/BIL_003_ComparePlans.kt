package com.movefuel.mufil2.ui.screens.bil

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun BIL003ComparePlansScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "BIL_003",
        title = "Compare Plans",
        subtitle = "Subscription and purchase states.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.BIL_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.BIL_002,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Pro","Core premium features",true)
            MFOptionCard("Plus","Expanded feature access")
            MFOptionCard("Max","Community / high-touch tier")
            MFNotice("Pricing source","Final prices come from platform/store configuration, not hardcoded UI.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun BIL003ComparePlansScreenPreview() {
    MoveFuelTheme { BIL003ComparePlansScreen {} }
}
