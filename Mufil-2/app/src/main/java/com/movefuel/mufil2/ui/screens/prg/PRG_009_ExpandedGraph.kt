package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG009ExpandedGraphScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_009",
        title = "Expanded Graph",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_010,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_008,
        onNavigate = onNavigate,
    ) {
            MFGraphCard("Expanded graph","Tap exact points for dates and values",listOf(8f,12f,10f,16f,18f,17f,24f,21f,27f,30f))
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG009ExpandedGraphScreenPreview() {
    MoveFuelTheme { PRG009ExpandedGraphScreen {} }
}
